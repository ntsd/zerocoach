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
  private loadedModelPath: string | null = null;

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
          n_ctx: 2048,
          n_gpu_layers: Platform.OS === 'ios' ? 99 : 1,
          n_threads: 4,
        });
      } catch (gpuErr) {
        console.warn('[LlamaRNEngine] GPU init failed, retrying on CPU:', gpuErr);
        this.llamaContext = await initLlama({
          model: modelPath,
          n_ctx: 2048,
          n_gpu_layers: 0,
          n_threads: 4,
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
  }

  public async unload(): Promise<void> {
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
  }

  public async streamCompletion(
    request: CompletionRequest,
    onToken: TokenCallback
  ): Promise<CompletionResult> {
    if (!this.isReady()) {
      throw new Error('LlamaRNEngine is not initialized with an active model context.');
    }

    this.abortRequested = false;
    const startTime = Date.now();
    let accumulatedText = '';
    let tokenCount = 0;

    // Dynamic prompt formatting: ChatML for Qwen 3 / ZeroCoach Athletic, Gemma template for Gemma 2
    const userMessage = request.messages[request.messages.length - 1]?.content || '';
    const isQwenOrChatML =
      !this.loadedModelPath ||
      this.loadedModelPath.toLowerCase().includes('qwen') ||
      this.loadedModelPath.toLowerCase().includes('zerocoach');

    const fullPrompt = isQwenOrChatML
      ? `<|im_start|>system\n${request.systemPrompt || 'You are ZeroCoach, an elite athletic coach and sports scientist.'}<|im_end|>\n<|im_start|>user\n${userMessage}<|im_end|>\n<|im_start|>assistant\n`
      : `<start_of_turn>user\n${request.systemPrompt ? `${request.systemPrompt}\n\n` : ''}${userMessage}<end_of_turn>\n<start_of_turn>model\n`;

    const result = await this.llamaContext.completion(
      {
        prompt: fullPrompt,
        n_predict: request.maxTokens || 512,
        temperature: request.temperature || 0.6,
        top_p: 0.9,
        top_k: 40,
        penalty_repeat: 1.18,
        penalty_freq: 0.5,
        penalty_present: 0.4,
        stop: [
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
      },
      (data: { token: string }) => {
        if (!this.abortRequested && data.token) {
          // Filter special tokens or turn markers that might leak into user stream
          if (
            data.token.includes('<start_of_turn>') ||
            data.token.includes('<end_of_turn>') ||
            data.token.includes('<|im_end|>') ||
            data.token.includes('<|endoftext|>')
          ) {
            return;
          }
          tokenCount++;
          accumulatedText += data.token;
          onToken(data.token);
        }
      }
    );

    const durationMs = Math.max(1, Date.now() - startTime);
    const tokensPerSecond = Number(((tokenCount / durationMs) * 1000).toFixed(1));

    return {
      fullText: result?.text || accumulatedText,
      tokensGenerated: tokenCount,
      tokensPerSecond,
      durationMs,
    };
  }
}
