import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';

export interface OpenAICompatibleEngineConfig {
  baseUrl: string;
  apiKey?: string;
  modelName: string;
}

export class OpenAICompatibleEngine implements LLMEngine {
  private config: OpenAICompatibleEngineConfig;
  private abortController: AbortController | null = null;
  private ready: boolean = true;

  constructor(config?: Partial<OpenAICompatibleEngineConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'http://localhost:11434/v1',
      apiKey: config?.apiKey || '',
      modelName: config?.modelName || 'llama3.2',
    };
  }

  public updateConfig(updates: Partial<OpenAICompatibleEngineConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getConfig(): OpenAICompatibleEngineConfig {
    return { ...this.config };
  }

  public async initialize(): Promise<boolean> {
    this.ready = true;
    return true;
  }

  public isReady(): boolean {
    return this.ready && Boolean(this.config.baseUrl.trim());
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

  private resolveEndpoint(path: string): string {
    let base = this.config.baseUrl.trim();
    // Remove trailing slash
    base = base.replace(/\/+$/, '');

    // If base doesn't have /v1 and path starts with /chat/completions, ensure /v1 if needed
    if (!base.endsWith('/v1') && !base.includes('/v1/')) {
      return `${base}/v1${path}`;
    }
    return `${base}${path}`;
  }

  public async testConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();
    try {
      const url = this.resolveEndpoint('/chat/completions');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.config.apiKey && this.config.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${this.config.apiKey.trim()}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: this.config.modelName || 'llama3.2',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 2,
          stream: false,
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
        message: `Connected successfully to ${this.config.modelName} (${latencyMs}ms)`,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timed out after 7s. Verify URL and port.',
          latencyMs,
        };
      }
      return {
        success: false,
        message: err?.message || 'Failed to connect. Ensure your local server is running and accessible.',
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

    const url = this.resolveEndpoint('/chat/completions');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey && this.config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${this.config.apiKey.trim()}`;
    }

    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...request.messages,
    ];

    let fullText = '';
    let tokenCount = 0;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: this.abortController.signal,
        body: JSON.stringify({
          model: this.config.modelName || 'llama3.2',
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errDetail = await response.text().catch(() => response.statusText);
        throw new Error(
          `OpenAI-compatible server responded with ${response.status}: ${errDetail.slice(0, 200)}`
        );
      }

      // Check if streaming via response.body ReadableStream is supported (standard on web and modern RN)
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (delta) {
                  tokenCount++;
                  fullText += delta;
                  onToken(delta);
                }
              } catch {
                // Ignore chunk parse errors
              }
            }
          }
        }
      } else {
        // Fallback for non-streaming reader environments
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';
        const tokens = content.match(/(\s+|[^\s]+)/g) || [content];

        for (const token of tokens) {
          tokenCount++;
          fullText += token;
          onToken(token);
          await new Promise((r) => setTimeout(r, 15));
        }
      }

      const durationMs = Math.max(1, Date.now() - startTime);
      const tokensPerSecond = Number(((tokenCount / durationMs) * 1000).toFixed(1));

      return {
        fullText,
        tokensGenerated: tokenCount,
        tokensPerSecond,
        durationMs,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const durationMs = Math.max(1, Date.now() - startTime);
        return {
          fullText,
          tokensGenerated: tokenCount,
          tokensPerSecond: Number(((tokenCount / durationMs) * 1000).toFixed(1)),
          durationMs,
        };
      }
      throw error;
    }
  }
}
