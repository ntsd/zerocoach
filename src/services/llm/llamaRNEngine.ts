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
      this.llamaContext = await initLlama({
        model: modelPath,
        n_ctx: 2048,
        n_gpu_layers: 1, // Offload to Metal (iOS) or OpenCL (Android)
        n_threads: 4,
      });

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

    // Format chat prompt using Gemma 2 / ChatML prompt template
    const fullPrompt = `${request.systemPrompt}\n\nUser: ${
      request.messages[request.messages.length - 1]?.content || ''
    }\n\nAssistant:`;

    const result = await this.llamaContext.completion(
      {
        prompt: fullPrompt,
        n_predict: request.maxTokens || 512,
        temperature: request.temperature || 0.7,
        stop: ['User:', 'Assistant:', '</s>', '<end_of_turn>'],
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
