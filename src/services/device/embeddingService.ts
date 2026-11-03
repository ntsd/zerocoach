import { Platform } from 'react-native';
import { useModelStore } from '@/store/useModelStore';

export class EmbeddingService {
  private static instance: EmbeddingService;
  private embeddingContext: any = null;
  private loadedModelPath: string | null = null;
  private isInitializing: boolean = false;

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  public isReady(): boolean {
    return Boolean(this.embeddingContext);
  }

  public getLoadedModelPath(): string | null {
    return this.loadedModelPath;
  }

  /**
   * Initializes a dedicated, lightweight llama.rn context with embedding: true
   */
  public async initEmbeddingContext(modelPath: string): Promise<boolean> {
    if (this.embeddingContext && this.loadedModelPath === modelPath) {
      return true;
    }

    if (this.isInitializing) {
      return false;
    }

    this.isInitializing = true;
    try {
      console.log(`[EmbeddingService] Initializing on-device embedding context from: ${modelPath}`);

      if (this.embeddingContext) {
        try {
          await this.embeddingContext.release();
        } catch (releaseErr) {
          console.warn('[EmbeddingService] Previous context release warning:', releaseErr);
        }
        this.embeddingContext = null;
      }

      if (Platform.OS === 'web') {
        console.log('[EmbeddingService] Web environment: local llama.rn embedding bypassed.');
        this.isInitializing = false;
        return false;
      }

      const { initLlama } = require('llama.rn');
      this.embeddingContext = await initLlama({
        model: modelPath,
        embedding: true,
        n_ctx: 512,
        n_gpu_layers: Platform.OS === 'ios' ? 99 : 0,
        use_mlock: false,
      });

      this.loadedModelPath = modelPath;
      console.log('[EmbeddingService] On-device GGUF embedding context initialized successfully.');
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.warn('[EmbeddingService] Failed to initialize on-device GGUF embedding context:', err);
      this.embeddingContext = null;
      this.loadedModelPath = null;
      this.isInitializing = false;
      return false;
    }
  }

  /**
   * Generates a dense embedding vector for text.
   * Priority:
   * 1. On-device llama.rn embedding context (0 network, instant)
   * 2. OpenAI / Gemini cloud embedding endpoint (if configured)
   * 3. Null (triggers token/BM25 fallback in memoryEngine)
   */
  public async getEmbedding(text: string): Promise<number[] | null> {
    const clean = text?.trim();
    if (!clean) return null;

    // 1. On-device llama.rn embedding context
    if (this.embeddingContext) {
      try {
        const result = await this.embeddingContext.embedding(clean);
        if (result && Array.isArray(result.embedding)) {
          return result.embedding;
        }
      } catch (err) {
        console.warn('[EmbeddingService] Native embedding inference error:', err);
      }
    }

    // 2. Cloud Fallback (OpenAI or Gemini) if configured
    try {
      const modelState = useModelStore.getState();
      const openAI = modelState.openAIConfig;

      if (openAI?.baseUrl && openAI?.apiKey) {
        const base = openAI.baseUrl.trim().replace(/\/+$/, '');
        const res = await fetch(`${base}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAI.apiKey.trim()}`,
          },
          body: JSON.stringify({
            input: clean,
            model: 'text-embedding-3-small',
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const vec = json?.data?.[0]?.embedding;
          if (Array.isArray(vec)) return vec;
        }
      }

      const geminiKey = modelState.geminiApiKey || openAI?.geminiApiKey;
      if (geminiKey) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text: clean }] },
            }),
          }
        );

        if (res.ok) {
          const json = await res.json();
          const values = json?.embedding?.values;
          if (Array.isArray(values)) return values;
        }
      }
    } catch (cloudErr) {
      console.warn('[EmbeddingService] Cloud embedding fallback failed:', cloudErr);
    }

    return null;
  }

  public async release(): Promise<void> {
    if (this.embeddingContext) {
      try {
        await this.embeddingContext.release();
      } catch (e) {
        console.warn('[EmbeddingService] Release error:', e);
      }
      this.embeddingContext = null;
      this.loadedModelPath = null;
    }
  }
}

export const embeddingService = EmbeddingService.getInstance();

