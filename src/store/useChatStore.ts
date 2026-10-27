import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ChatState } from '@/types/chat';
import { AppLanguage } from '@/types/coach';
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

        // Auto-detect Thai input or explicit Thai language setting to prevent model cross-lingual drift
        const hasThaiInPrompt =
          /[\u0E00-\u0E7F]/.test(trimmed) ||
          updatedMessages.some((m) => m.role === 'user' && /[\u0E00-\u0E7F]/.test(m.content));
        const effectiveLanguage: AppLanguage =
          coachState.language === 'th' || hasThaiInPrompt ? 'th' : 'en';

        // Dynamic system prompt construction tailored to model parameter capacity
        // All on-device quantized models use compact prompts (~200 tokens) to ensure fast inference and avoid context exhaustion
        const isCompactModel = modelState.provider === 'on_device';

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
              language: effectiveLanguage,
            })
          : buildSystemPrompt({
              mode: coachState.mode,
              userProfile: coachState.userProfile,
              telemetry: telemetryState.metrics,
              activeStages: telemetryState.calisthenicsStages,
              nutritionSummary,
              language: effectiveLanguage,
            });

        // Filter out welcome banner, error notices, apologies/refusals, and Japanese drift from prompt context
        const filteredHistory = updatedMessages
          .filter((m) => {
            if (m.id === 'welcome-msg') return false;
            if (m.content.startsWith('⚠️')) return false;
            // Omit previous refusal/apology responses so the model doesn't mimic them
            if (
              m.role === 'assistant' &&
              (m.content.includes('ขออภัย') ||
                m.content.includes('ไม่สามารถให้คำแนะนำ') ||
                m.content.includes('ฉันเป็นเพียง') ||
                (effectiveLanguage === 'th' && /[\u3040-\u309F\u30A0-\u30FF]/.test(m.content)))
            ) {
              return false;
            }
            return true;
          })
          .slice(-4);

        // Compress older assistant turns to conserve prompt tokens for fast on-device prefill
        const contextMessages = filteredHistory.map((m, idx) => {
          let content = m.content.trim();
          if (m.role === 'assistant' && idx < filteredHistory.length - 1 && content.length > 240) {
            content = content.slice(0, 240) + '...';
          }
          return {
            role: m.role,
            content,
          };
        });

        try {
          console.log(`[useChatStore] Generating response (lang: ${effectiveLanguage}, promptLen: ${systemPrompt.length}, historyCount: ${contextMessages.length})`);
          let streamedText = '';
          const result = await llmService.streamCompletion(
            {
              systemPrompt,
              messages: contextMessages,
              temperature: 0.65,
            },
            (token: string) => {
              streamedText += token;
              set({ streamingMessage: streamedText });
            }
          );

          console.log(`[useChatStore] Generation complete (${result.tokensGenerated} tokens, ${result.tokensPerSecond} t/s):\n${result.fullText}`);

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
          const errorMsg: ChatMessage = {
            id: `msg-err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${err?.message || 'Inference error encountered. Please try again.'}`,
            timestamp: Date.now(),
            modeAtCreation: coachState.mode,
          };
          set({
            messages: [...updatedMessages, errorMsg],
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
        set({ isGenerating: false, streamingMessage: '' });
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
