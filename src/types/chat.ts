import { CoachingMode } from './coach';
import { AgentExecutionStep } from '@/services/agent/types';

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
  executionSteps?: AgentExecutionStep[];
}

export interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingMessage: string;
  activeSteps?: AgentExecutionStep[];
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => void;
  stopGeneration: () => void;
}
