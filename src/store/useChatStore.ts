import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ChatState } from '@/types/chat';
import { AppLanguage } from '@/types/coach';
import { useCoachStore } from './useCoachStore';
import { useTelemetryStore } from './useTelemetryStore';
import { useNutritionStore } from './useNutritionStore';
import { useWorkoutStore } from './useWorkoutStore';
import { buildSystemPrompt, buildCompactSystemPrompt } from '@/services/prompts/systemPromptBuilder';
import { llmService } from '@/services/llm/llmService';
import { useModelStore } from './useModelStore';
import { AgentHarness } from '@/services/agent/agentHarness';
import { AgentExecutionStep } from '@/services/agent/types';
import { analyzeMealPhoto } from '@/services/nutrition/photoMealAnalyzer';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content: `### ⚡ ZeroCoach AI
Private on-device AI & sports science coach with Agent Action Harness.

Ask me to log food, swap an exercise in today's workout, check your wearable readiness telemetry, or update your targets.`,
  timestamp: Date.now(),
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [INITIAL_WELCOME_MESSAGE],
      isGenerating: false,
      streamingMessage: '',
      activeSteps: [],
      error: null,

      sendMessage: async (text: string, imageUri?: string, base64Data?: string | null) => {
        const trimmed = text.trim();
        if ((!trimmed && !imageUri) || get().isGenerating) return;

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

        const defaultPrompt =
          coachState.language === 'th' || /[\u0E00-\u0E7F]/.test(trimmed)
            ? 'ช่วยวิเคราะห์ภาพนี้ให้หน่อย'
            : 'Analyze this image and break down what you see.';

        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
          role: 'user',
          content: trimmed || defaultPrompt,
          timestamp: Date.now(),
          readinessAtCreation: telemetryState.metrics.readinessScore,
          imageUri,
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

        const todayDate = new Date().toISOString().split('T')[0];
        const workoutState = useWorkoutStore.getState();
        const todayPlan = workoutState.getPlanForDate(todayDate);
        const workoutSummary = todayPlan
          ? `"${todayPlan.title}" (${todayPlan.exercises.length} exercises)`
          : 'None scheduled yet';

        const systemPrompt = isCompactModel
          ? buildCompactSystemPrompt({
              userProfile: coachState.userProfile,
              telemetry: telemetryState.metrics,
              nutritionSummary,
              workoutSummary,
              todayDate,
              language: effectiveLanguage,
            })
          : buildSystemPrompt({
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

        let visualContext = '';
        if (imageUri) {
          try {
            console.log('[useChatStore] Analyzing attached image with photoMealAnalyzer...');
            const photoAnalysis = await analyzeMealPhoto(
              imageUri,
              base64Data,
              modelState.openAIConfig,
              undefined,
              trimmed,
              modelState.geminiApiKey
            );
            console.log('[useChatStore] Photo analysis result:', photoAnalysis);

            if (photoAnalysis.canIdentify && photoAnalysis.dishTitle) {
              const nutrients = photoAnalysis.decomposition?.totalNutrients;
              visualContext = `\n[ATTACHED PHOTO IDENTIFIED: "${photoAnalysis.dishTitle}" (${photoAnalysis.ingredientsText || ''}) | Nutrition: ${nutrients?.calories || 0} kcal, ${nutrients?.proteinGrams || 0}g protein, ${nutrients?.carbsGrams || 0}g carbs, ${nutrients?.fatGrams || 0}g fat. You can offer to log this using add_food_item or explain how it fits the athlete's nutrition targets.]`;
            } else if (photoAnalysis.errorMessage) {
              visualContext = `\n[ATTACHED PHOTO: Note: ${photoAnalysis.errorMessage}]`;
            }
          } catch (visionErr) {
            console.warn('[useChatStore] Vision analysis error:', visionErr);
          }
        }

        // Compress older assistant turns to conserve prompt tokens for fast on-device prefill
        const contextMessages = filteredHistory.map((m, idx) => {
          let content = m.content.trim();
          if (idx === filteredHistory.length - 1 && visualContext) {
            content = `${content}${visualContext}`;
          }
          if (m.role === 'assistant' && idx < filteredHistory.length - 1 && content.length > 240) {
            content = content.slice(0, 240) + '...';
          }
          return {
            role: m.role,
            content,
          };
        });

        try {
          console.log(`[useChatStore] Running Agent Harness (lang: ${effectiveLanguage}, promptLen: ${systemPrompt.length}, historyCount: ${contextMessages.length})`);
          let streamedText = '';
          const currentSteps: AgentExecutionStep[] = [];

          const result = await AgentHarness.run({
            systemPrompt,
            messages: contextMessages,
            temperature: 0.65,
            mediaPaths: imageUri ? [imageUri] : undefined,
            callbacks: {
              onToken: (token: string) => {
                streamedText += token;
                set({ streamingMessage: streamedText });
              },
              onStepUpdate: (step: AgentExecutionStep) => {
                const existingIdx = currentSteps.findIndex((s) => s.id === step.id);
                if (existingIdx >= 0) {
                  currentSteps[existingIdx] = step;
                } else {
                  currentSteps.push(step);
                }
                streamedText = '';
                set({ activeSteps: [...currentSteps], streamingMessage: '' });
              },
            },
          });

          console.log(`[useChatStore] Generation complete (${result.tokensGenerated} tokens, ${result.tokensPerSecond} t/s, ${result.steps.length} steps):\n${result.fullText}`);

          const assistantMsg: ChatMessage = {
            id: `msg-asst-${Date.now()}`,
            role: 'assistant',
            content: result.fullText,
            timestamp: Date.now(),
            readinessAtCreation: telemetryState.metrics.readinessScore,
            tokensGenerated: result.tokensGenerated,
            tokensPerSecond: result.tokensPerSecond,
            executionSteps: result.steps.length > 0 ? result.steps : undefined,
          };

          set({
            messages: [...updatedMessages, assistantMsg],
            isGenerating: false,
            streamingMessage: '',
            activeSteps: [],
          });
        } catch (err: any) {
          console.error('[ChatStore] Error generating response:', err);
          const errorMsg: ChatMessage = {
            id: `msg-err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${err?.message || 'Inference error encountered. Please try again.'}`,
            timestamp: Date.now(),
          };
          set({
            messages: [...updatedMessages, errorMsg],
            isGenerating: false,
            streamingMessage: '',
            activeSteps: [],
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
          activeSteps: [],
          error: null,
        });
      },

      stopGeneration: () => {
        llmService.stopCompletion();
        set({ isGenerating: false, streamingMessage: '', activeSteps: [] });
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
