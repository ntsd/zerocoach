import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';

export interface GeminiEngineConfig {
  apiKey: string;
  modelName?: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-1.5-flash';

export class GeminiEngine implements LLMEngine {
  private config: GeminiEngineConfig;
  private abortController: AbortController | null = null;
  private ready: boolean = true;

  constructor(config?: Partial<GeminiEngineConfig>) {
    this.config = {
      apiKey: config?.apiKey || '',
      modelName: config?.modelName || DEFAULT_GEMINI_MODEL,
    };
  }

  public updateConfig(updates: Partial<GeminiEngineConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getConfig(): GeminiEngineConfig {
    return { ...this.config };
  }

  public async initialize(): Promise<boolean> {
    this.ready = true;
    return true;
  }

  public isReady(): boolean {
    return this.ready && Boolean(this.config.apiKey.trim());
  }

  public stopCompletion(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async unload(): Promise<void> {
    this.stopCompletion();
    this.ready = false;
  }

  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const key = this.config.apiKey.trim();
    if (!key) {
      return { success: false, message: 'Google AI Studio API key is missing.' };
    }

    const startTime = Date.now();
    try {
      const model = this.config.modelName || DEFAULT_GEMINI_MODEL;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        return {
          success: false,
          message: `HTTP ${res.status}: ${errorText.slice(0, 150)}`,
          latencyMs,
        };
      }

      return {
        success: true,
        message: `Connected to Google Gemini (${latencyMs}ms)`,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        message: err?.message || 'Connection failed',
        latencyMs,
      };
    }
  }

  public async streamCompletion(
    request: CompletionRequest,
    onToken: TokenCallback
  ): Promise<CompletionResult> {
    this.stopCompletion();
    this.abortController = new AbortController();
    const startTime = Date.now();

    const key = this.config.apiKey.trim();
    if (!key) {
      throw new Error('Google AI Studio API key not configured. Add your key in Settings.');
    }

    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 1500,
      },
    };

    if (request.systemPrompt && request.systemPrompt.trim()) {
      payload.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const tryModels = [
      this.config.modelName || DEFAULT_GEMINI_MODEL,
      FALLBACK_GEMINI_MODEL,
    ];

    let lastError: Error | null = null;

    for (const model of tryModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: this.abortController.signal,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => res.statusText);
          throw new Error(`Gemini ${model} HTTP ${res.status}: ${errBody.slice(0, 200)}`);
        }

        let fullText = '';
        let tokenCount = 0;

        // Try streaming via reader if available in the environment
        if (res.body && typeof (res.body as any).getReader === 'function') {
          const reader = (res.body as any).getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ')) {
                const dataJson = trimmedLine.slice(6).trim();
                if (dataJson === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataJson);
                  const candidate = parsed.candidates?.[0];
                  const partText = candidate?.content?.parts?.[0]?.text;
                  if (partText) {
                    fullText += partText;
                    tokenCount++;
                    onToken(partText);
                  }
                } catch {
                  // Partial JSON, ignore
                }
              }
            }
          }
        } else {
          // Fallback if reader is unavailable: parse full SSE / JSON text and stream token chunks
          const rawText = await res.text();
          const lines = rawText.split('\n');

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const dataJson = trimmedLine.slice(6).trim();
              if (dataJson === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataJson);
                const candidate = parsed.candidates?.[0];
                const partText = candidate?.content?.parts?.[0]?.text;
                if (partText) {
                  fullText += partText;
                  tokenCount++;
                  onToken(partText);
                  // Micro-delay for visual streaming smoothness
                  await new Promise((r) => setTimeout(r, 12));
                }
              } catch {
                // Ignore malformed chunks
              }
            }
          }
        }

        if (fullText.trim().length > 0) {
          const durationMs = Math.max(1, Date.now() - startTime);
          const tokensPerSecond = Number(((tokenCount / durationMs) * 1000).toFixed(1));

          return {
            fullText,
            tokensGenerated: tokenCount,
            tokensPerSecond,
            durationMs,
          };
        }
      } catch (modelErr: any) {
        if (modelErr.name === 'AbortError') {
          throw modelErr;
        }
        lastError = modelErr;
        console.warn(`[GeminiEngine] Error with ${model}, trying fallback:`, modelErr);
      }
    }

    throw lastError || new Error('Failed to generate response from Google Gemini.');
  }
}
