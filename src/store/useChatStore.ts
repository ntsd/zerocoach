import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ChatState } from '@/types/chat';
import { useCoachStore } from './useCoachStore';
import { useTelemetryStore } from './useTelemetryStore';
import { useNutritionStore } from './useNutritionStore';
import { buildSystemPrompt, buildCompactSystemPrompt } from '@/services/prompts/systemPromptBuilder';
import { llmService } from '@/services/llm/llmService';
import { useModelStore } from './useModelStore';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content: `### ⚡ ZeroCoach AI
Private on-device AI & sports science coach.

Ask me to suggest food for your remaining macros, adjust your training plan, or guide your skill progression.`,
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

        const modelState = useModelStore.getState();
        if (!llmService.isReady()) {
          console.warn('[useChatStore] Cannot send message: LLM model is not ready/loaded.');
          const err =
            modelState.provider === 'on_device'
              ? 'On-device model is not loaded. Please download or load the model in Settings.'
              : modelState.provider === 'gemini'
              ? 'Gemini API key is missing. Please configure your API key in Settings.'
              : 'OpenAI endpoint is not configured. Please check Settings.';
          set({ error: err, isGenerating: false });
          return;
        }

        const coachState = useCoachStore.getState();
        const telemetryState = useTelemetryStore.getState();
        const nutritionState = useNutritionStore.getState();
        const currentNutritionLog = nutritionState.getDailyLog();
        const currentNutritionSummary = nutritionState.getSummaryForDate();

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

        // Dynamic system prompt construction tailored to model parameter capacity
        const isCompactModel =
          modelState.provider === 'on_device' &&
          (modelState.currentModel.sizeBytes < 500000000 ||
            modelState.currentModel.id === 'zerocoach-athletic-q4_0');

        const nutritionSummary = {
          totalCalories: currentNutritionSummary.totalCalories,
          targetCalories: currentNutritionLog.targetCalories,
          totalProtein: currentNutritionSummary.totalProtein,
          targetProtein: currentNutritionLog.targetProtein,
          totalCarbs: currentNutritionSummary.totalCarbs,
          totalFat: currentNutritionSummary.totalFat,
          totalFiber: currentNutritionSummary.totalFiber,
          remainingCalories: currentNutritionSummary.remainingCalories,
          remainingProtein: currentNutritionSummary.remainingProtein,
          loggedMealsCount: currentNutritionLog.foods.length,
        };

        const systemPrompt = isCompactModel
          ? buildCompactSystemPrompt({
              mode: coachState.mode,
              userProfile: coachState.userProfile,
              telemetry: telemetryState.metrics,
              nutritionSummary,
              language: coachState.language,
            })
          : buildSystemPrompt({
              mode: coachState.mode,
              userProfile: coachState.userProfile,
              telemetry: telemetryState.metrics,
              activeStages: telemetryState.calisthenicsStages,
              nutritionSummary,
              language: coachState.language,
            });

        // Limit context to last 6 messages to protect mobile memory budget
        const contextMessages = updatedMessages.slice(-6).map((m) => ({
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
