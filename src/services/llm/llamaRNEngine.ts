import { Platform } from 'react-native';
import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';

/**
 * LlamaRNEngine bridges directly to `llama.rn` (llama.cpp)
 * to run quantized GGUF models directly on-device with Metal / OpenCL acceleration.
 */
export class LlamaRNEngine implements LLMEngine {
  private llamaContext: any = null;
  private isModelReady: boolean = false;
  private abortRequested: boolean = false;
  private isInferring: boolean = false;
  private loadedModelPath: string | null = null;
  private isMultimodalActive: boolean = false;

  public async initialize(modelPath?: string): Promise<boolean> {
    if (!modelPath) {
      console.warn('[LlamaRNEngine] No model path specified.');
      return false;
    }

    try {
      // Dynamic import to allow graceful fallback when native module is not yet compiled
      const { initLlama } = require('llama.rn');

      console.log(`[LlamaRNEngine] Initializing GGUF model from: ${modelPath}`);
      try {
        this.llamaContext = await initLlama({
          model: modelPath,
          n_ctx: 4096,
          n_batch: 512,
          n_gpu_layers: Platform.OS === 'ios' ? 99 : 1,
          n_threads: 4,
          ctx_shift: true,
        });
      } catch (gpuErr) {
        console.warn('[LlamaRNEngine] GPU init failed, retrying on CPU:', gpuErr);
        this.llamaContext = await initLlama({
          model: modelPath,
          n_ctx: 4096,
          n_batch: 512,
          n_gpu_layers: 0,
          n_threads: 4,
          ctx_shift: true,
        });
      }

      this.isModelReady = true;
      this.loadedModelPath = modelPath;
      console.log('[LlamaRNEngine] llama.rn context initialized successfully.');
      return true;
    } catch (error) {
      console.warn('[LlamaRNEngine] Native llama.rn initialization unavailable:', error);
      this.isModelReady = false;
      this.loadedModelPath = null;
      return false;
    }
  }

  public async initMultimodal(mmprojPath: string): Promise<boolean> {
    if (!this.llamaContext || typeof this.llamaContext.initMultimodal !== 'function') {
      console.warn('[LlamaRNEngine] initMultimodal called but llama context is not ready.');
      return false;
    }
    try {
      console.log(`[LlamaRNEngine] Initializing multimodal vision with mmproj: ${mmprojPath}`);
      const success = await this.llamaContext.initMultimodal({
        path: mmprojPath,
        use_gpu: Platform.OS === 'ios',
        image_max_tokens: 512,
      });
      this.isMultimodalActive = Boolean(success);
      console.log(`[LlamaRNEngine] initMultimodal success: ${this.isMultimodalActive}`);
      return this.isMultimodalActive;
    } catch (err) {
      console.warn('[LlamaRNEngine] initMultimodal failed:', err);
      this.isMultimodalActive = false;
      return false;
    }
  }

  public isMultimodalEnabled(): boolean {
    return this.isMultimodalActive;
  }

  public isReady(): boolean {
    return this.isModelReady && this.llamaContext !== null;
  }

  public getLoadedModelPath(): string | null {
    return this.loadedModelPath;
  }

  public stopCompletion(): void {
    this.abortRequested = true;
    if (this.llamaContext && typeof this.llamaContext.stopCompletion === 'function') {
      try {
        this.llamaContext.stopCompletion();
      } catch (err) {
        console.warn('[LlamaRNEngine] Error stopping completion:', err);
      }
    }
    this.isInferring = false;
  }

  public async unload(): Promise<void> {
    this.isMultimodalActive = false;
    if (this.llamaContext && typeof this.llamaContext.release === 'function') {
      try {
        await this.llamaContext.release();
      } catch (err) {
        console.warn('[LlamaRNEngine] Error releasing context:', err);
      }
    }
    this.llamaContext = null;
    this.isModelReady = false;
    this.loadedModelPath = null;
    this.isInferring = false;
  }

  public async streamCompletion(
    request: CompletionRequest,
    onToken: TokenCallback
  ): Promise<CompletionResult> {
    if (!this.isReady()) {
      throw new Error('LlamaRNEngine is not initialized with an active model context.');
    }

    if (this.isInferring) {
      console.warn('[LlamaRNEngine] Prior inference still running. Aborting previous call before starting new turn.');
      this.stopCompletion();
      await new Promise((r) => setTimeout(r, 120));
    }

    this.isInferring = true;
    this.abortRequested = false;
    const startTime = Date.now();
    let accumulatedText = '';
    let tokenCount = 0;

    try {
      // Dynamic prompt formatting: multi-turn ChatML for Qwen 3 / ZeroCoach Athletic, Gemma template for Gemma 2
      const isQwenOrChatML =
        !this.loadedModelPath ||
        this.loadedModelPath.toLowerCase().includes('qwen') ||
        this.loadedModelPath.toLowerCase().includes('zerocoach');

      // Deterministic sliding-window context budget: keep at most last 3 messages, capped per message
      const recentMessages = request.messages.slice(-3).map((m, idx, arr) => {
        const isLast = idx === arr.length - 1;
        const cleanContent = m.content
          .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '')
          .trim();
        return {
          ...m,
          content: isLast ? m.content.trim() : cleanContent.slice(0, 220),
        };
      });

      // Check if conversation involves Thai language
      const isThaiConversation =
        /[\u0E00-\u0E7F]/.test(request.systemPrompt || '') ||
        recentMessages.some((m) => /[\u0E00-\u0E7F]/.test(m.content));

      let fullPrompt = '';
      if (isQwenOrChatML) {
        const sysPrompt = (request.systemPrompt || 'You are ZeroCoach, an elite athletic coach and sports scientist.').trim();
        fullPrompt = `<|im_start|>system\n${sysPrompt}<|im_end|>\n`;
        for (let i = 0; i < recentMessages.length; i++) {
          const msg = recentMessages[i];
          let content = msg.content.trim();
          // For multimodal inference, inject <__media__> into the user message turn
          // This prevents llama.rn from appending the marker after the assistant turn
          if (
            msg.role === 'user' &&
            i === recentMessages.length - 1 &&
            request.mediaPaths &&
            request.mediaPaths.length > 0
          ) {
            if (!content.includes('<__media__>')) {
              content = `<__media__>\n${content}`;
            }
          }
          fullPrompt += `<|im_start|>${msg.role}\n${content}<|im_end|>\n`;
        }
        fullPrompt += `<|im_start|>assistant\n`;
      } else {
        // Gemma 2 format
        let isFirstUser = true;
        fullPrompt = '';
        for (const msg of recentMessages) {
          if (msg.role === 'user') {
            if (isFirstUser && request.systemPrompt) {
              fullPrompt += `<start_of_turn>user\n${request.systemPrompt}\n\n${msg.content}<end_of_turn>\n`;
              isFirstUser = false;
            } else {
              fullPrompt += `<start_of_turn>user\n${msg.content}<end_of_turn>\n`;
            }
          } else {
            fullPrompt += `<start_of_turn>model\n${msg.content}<end_of_turn>\n`;
          }
        }
        if (isFirstUser && request.systemPrompt) {
          fullPrompt = `<start_of_turn>user\n${request.systemPrompt}<end_of_turn>\n`;
        }
        fullPrompt += `<start_of_turn>model\n`;
      }

      let inThinkTag = false;

      const temperature = request.temperature !== undefined ? request.temperature : 0.1;
      const topP = 0.9;
      const topK = 40;
      const penaltyRepeat = 1.1;

      console.log(`[LlamaRNEngine] Sending prompt to llama.rn (${fullPrompt.length} chars, temp: ${temperature})`);

      const completionParams: any = {
        prompt: fullPrompt,
        n_predict: request.maxTokens || 384,
        temperature,
        top_p: topP,
        top_k: topK,
        penalty_repeat: penaltyRepeat,
        penalty_freq: 0.1,
        penalty_present: 0.1,
        stop: [
          '</tool_call>',
          '<start_of_turn>',
          '<end_of_turn>',
          '<|im_start|>',
          '<|im_end|>',
          '<|endoftext|>',
          '<eos>',
          '</s>',
          'User:',
          'user:',
          'Assistant:',
          'assistant:',
          'Athlete:',
        ],
      };

      if (request.mediaPaths && request.mediaPaths.length > 0) {
        completionParams.media_paths = request.mediaPaths.map((p) => {
          if (p.startsWith('data:') || !p.startsWith('file://')) {
            return p;
          }
          return decodeURIComponent(p.replace(/^file:\/\//, ''));
        });
        console.log(`[LlamaRNEngine] Attaching ${completionParams.media_paths.length} sanitized image path(s) to completion:`, completionParams.media_paths);
      }

      const tokenHandler = (data: { token: string }) => {
        if (!this.abortRequested && data.token) {
          // Filter special tokens or turn markers that might leak into user stream
          if (
            data.token.includes('<start_of_turn>') ||
            data.token.includes('<end_of_turn>') ||
            data.token.includes('<|im_end|>') ||
            data.token.includes('<|endoftext|>') ||
            data.token.includes('<|im_start|>')
          ) {
            return;
          }

          // Handle Qwen 3 thinking tags to prevent leaking internal chain-of-thought into UI
          if (data.token.includes('<think>') || data.token.includes('[Start thinking]')) {
            inThinkTag = true;
            return;
          }
          if (data.token.includes('</think>') || data.token.includes('[End thinking]')) {
            inThinkTag = false;
            return;
          }
          if (inThinkTag) {
            return;
          }

          // In Thai conversation mode, if Japanese kana somehow leaks, block it from user stream
          if (isThaiConversation && /[\u3040-\u309F\u30A0-\u30FF]/.test(data.token)) {
            return;
          }

          tokenCount++;
          accumulatedText += data.token;
          onToken(data.token);
        }
      };

      let result: any;
      try {
        result = await this.llamaContext.completion(completionParams, tokenHandler);
      } catch (compErr: any) {
        const errMsg = String(compErr?.message || compErr || '');
        if (errMsg.toLowerCase().includes('context is full')) {
          console.warn('[LlamaRNEngine] Context overflow detected; retrying with compacted prompt...');
          const lastMsg = recentMessages[recentMessages.length - 1];
          const shortSys = (request.systemPrompt || 'You are ZeroCoach, an elite athletic coach.').split('[AGENT MODE')[0].trim().slice(0, 1200);
          const fallbackPrompt = isQwenOrChatML
            ? `<|im_start|>system\n${shortSys}<|im_end|>\n<|im_start|>user\n${(lastMsg?.content || '').slice(-1500)}<|im_end|>\n<|im_start|>assistant\n`
            : `<start_of_turn>user\n${shortSys}\n\n${(lastMsg?.content || '').slice(-1500)}<end_of_turn>\n<start_of_turn>model\n`;
          result = await this.llamaContext.completion(
            {
              ...completionParams,
              prompt: fallbackPrompt,
              n_predict: Math.min(completionParams.n_predict || 256, 256),
            },
            tokenHandler
          );
        } else {
          throw compErr;
        }
      }

      const durationMs = Math.max(1, Date.now() - startTime);
      const tokensPerSecond = Number(((tokenCount / durationMs) * 1000).toFixed(1));

      return {
        fullText: result?.text || accumulatedText,
        tokensGenerated: tokenCount,
        tokensPerSecond,
        durationMs,
      };
    } finally {
      this.isInferring = false;
    }
  }
}
