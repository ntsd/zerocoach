export type TokenCallback = (token: string) => void;

export interface CompletionRequest {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  mediaPaths?: string[];
}

export interface CompletionResult {
  fullText: string;
  tokensGenerated: number;
  tokensPerSecond: number;
  durationMs: number;
}

export interface LLMEngine {
  initialize(modelPath?: string): Promise<boolean>;
  streamCompletion(
    request: CompletionRequest,
    onToken: TokenCallback
  ): Promise<CompletionResult>;
  stopCompletion(): void;
  unload(): Promise<void>;
  isReady(): boolean;
}
