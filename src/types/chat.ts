import { CoachingMode } from './coach';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  modeAtCreation: CoachingMode;
  readinessAtCreation?: number;
  tokensGenerated?: number;
  tokensPerSecond?: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingMessage: string;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
  stopGeneration: () => void;
}
