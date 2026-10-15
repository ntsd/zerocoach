import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ChatState } from '@/types/chat';
import { useCoachStore } from './useCoachStore';
import { useTelemetryStore } from './useTelemetryStore';
import { buildSystemPrompt } from '@/services/prompts/systemPromptBuilder';
import { llmService } from '@/services/llm/llmService';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content: `### ⚡ ZeroCoach Ready
On-device AI active. All your training and biometrics stay 100% private on your phone.

Ask me to design your workout session, adjust your daily macros, or guide your skill progression.`,
  timestamp: Date.now(),
  modeAtCreation: 'strict',
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [INITIAL_WELCOME_MESSAGE],
      isGenerating: false,
      streamingMessage: '',
      error: null,

      sendMessage: async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || get().isGenerating) return;

        const coachState = useCoachStore.getState();
        const telemetryState = useTelemetryStore.getState();

        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
          role: 'user',
          content: trimmed,
          timestamp: Date.now(),
          modeAtCreation: coachState.mode,
          readinessAtCreation: telemetryState.metrics.readinessScore,
        };

        const updatedMessages = [...get().messages, userMsg];
        set({
          messages: updatedMessages,
          isGenerating: true,
          streamingMessage: '',
          error: null,
        });

        // Dynamic system prompt construction
        const systemPrompt = buildSystemPrompt({
          mode: coachState.mode,
          userProfile: coachState.userProfile,
          telemetry: telemetryState.metrics,
          activeStages: telemetryState.calisthenicsStages,
        });

        // Limit context to last 8 messages to protect mobile memory budget
        const contextMessages = updatedMessages.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        try {
          let streamedText = '';
          const result = await llmService.streamCompletion(
            {
              systemPrompt,
              messages: contextMessages,
            },
            (token: string) => {
              streamedText += token;
              set({ streamingMessage: streamedText });
            }
          );

          const assistantMsg: ChatMessage = {
            id: `msg-asst-${Date.now()}`,
            role: 'assistant',
            content: result.fullText,
            timestamp: Date.now(),
            modeAtCreation: coachState.mode,
            readinessAtCreation: telemetryState.metrics.readinessScore,
            tokensGenerated: result.tokensGenerated,
            tokensPerSecond: result.tokensPerSecond,
          };

          set({
            messages: [...updatedMessages, assistantMsg],
            isGenerating: false,
            streamingMessage: '',
          });
        } catch (err: any) {
          console.error('[ChatStore] Error generating response:', err);
          set({
            isGenerating: false,
            streamingMessage: '',
            error: err?.message || 'Inference error encountered.',
          });
        }
      },

      clearHistory: () => {
        set({
          messages: [
            {
              ...INITIAL_WELCOME_MESSAGE,
              timestamp: Date.now(),
            },
          ],
          streamingMessage: '',
          error: null,
        });
      },

      stopGeneration: () => {
        llmService.stopCompletion();
        set({ isGenerating: false });
      },
    }),
    {
      name: 'zerocoach-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist transient generation states
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
