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
      console.log('[LlamaRNEngine] llama.rn context initialized successfully.');
      return true;
    } catch (error) {
      console.warn('[LlamaRNEngine] Native llama.rn initialization unavailable:', error);
      this.isModelReady = false;
      return false;
    }
  }

  public isReady(): boolean {
    return this.isModelReady && this.llamaContext !== null;
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

    // Format chat prompt using official Gemma 2 instruction template
    const userMessage = request.messages[request.messages.length - 1]?.content || '';
    const fullPrompt = `<start_of_turn>user\n${request.systemPrompt ? `${request.systemPrompt}\n\n` : ''}${userMessage}<end_of_turn>\n<start_of_turn>model\n`;

    const result = await this.llamaContext.completion(
      {
        prompt: fullPrompt,
        n_predict: request.maxTokens || 512,
        temperature: request.temperature || 0.7,
        stop: ['<start_of_turn>', '<end_of_turn>', '<eos>', '</s>', 'User:', 'Assistant:'],
      },
      (data: { token: string }) => {
        if (!this.abortRequested && data.token) {
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
