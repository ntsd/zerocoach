import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedWorkoutSession, WorkoutDraftSession } from '@/types/history';
import { GeneratedWorkoutPlan, ExerciseItem } from '@/types/workout';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface WorkoutState {
  selectedDate: string;
  activeDraft: WorkoutDraftSession | null;
  historyByDate: Record<string, CompletedWorkoutSession>;
  plansByDate: Record<string, GeneratedWorkoutPlan>;

  // Actions
  setSelectedDate: (date: string) => void;
  saveDraft: (draft: WorkoutDraftSession) => void;
  clearDraft: () => void;
  finishWorkout: (
    sessionData: Omit<CompletedWorkoutSession, 'id' | 'completedAt'>
  ) => CompletedWorkoutSession;
  getWorkoutForDate: (date: string) => CompletedWorkoutSession | undefined;
  getRecentHistory: (daysCount: number) => CompletedWorkoutSession[];
  clearWorkoutHistory: () => void;

  // Workout Plan Actions (Symmetric UI & AI Read/Write Access)
  getPlanForDate: (date: string) => GeneratedWorkoutPlan | undefined;
  savePlanForDate: (date: string, plan: GeneratedWorkoutPlan) => void;
  updatePlanExercises: (date: string, exercises: ExerciseItem[]) => void;
  swapPlanExercise: (
    date: string,
    targetExerciseId: string,
    replacement: ExerciseItem
  ) => boolean;
  clearPlanForDate: (date: string) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist<WorkoutState>(
    (set, get) => ({
      selectedDate: getTodayString(),
      activeDraft: null,
      historyByDate: {},
      plansByDate: {},

      setSelectedDate: (date: string) => {
        set({ selectedDate: date });
      },

      saveDraft: (draft: WorkoutDraftSession) => {
        set({ activeDraft: draft });
      },

      clearDraft: () => {
        set({ activeDraft: null });
      },

      finishWorkout: (
        sessionData: Omit<CompletedWorkoutSession, 'id' | 'completedAt'>
      ) => {
        const id = `workout-${sessionData.date}-${Date.now()}`;
        const completedSession: CompletedWorkoutSession = {
          ...sessionData,
          id,
          completedAt: Date.now(),
        };

        set((state) => ({
          historyByDate: {
            ...state.historyByDate,
            [sessionData.date]: completedSession,
          },
          // Clear active draft once finished
          activeDraft: null,
        }));

        return completedSession;
      },

      getWorkoutForDate: (date: string) => {
        return get().historyByDate[date];
      },

      getRecentHistory: (daysCount: number) => {
        const historyMap = get().historyByDate;
        const now = new Date();
        const results: CompletedWorkoutSession[] = [];

        for (let i = 0; i < daysCount; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          if (historyMap[dateStr]) {
            results.push(historyMap[dateStr]);
          }
        }

        return results;
      },

      clearWorkoutHistory: () => {
        set({ historyByDate: {}, activeDraft: null });
      },

      getPlanForDate: (date: string) => {
        return get().plansByDate[date];
      },

      savePlanForDate: (date: string, plan: GeneratedWorkoutPlan) => {
        set((state) => ({
          plansByDate: {
            ...state.plansByDate,
            [date]: plan,
          },
        }));
      },

      updatePlanExercises: (date: string, exercises: ExerciseItem[]) => {
        const currentPlan = get().plansByDate[date];
        if (currentPlan) {
          set((state) => ({
            plansByDate: {
              ...state.plansByDate,
              [date]: {
                ...currentPlan,
                exercises,
              },
            },
          }));
        }
      },

      swapPlanExercise: (
        date: string,
        targetExerciseId: string,
        replacement: ExerciseItem
      ) => {
        const currentPlan = get().plansByDate[date];
        if (!currentPlan) return false;
        const index = currentPlan.exercises.findIndex((ex) => ex.id === targetExerciseId);
        if (index === -1) return false;

        const updatedExercises = [...currentPlan.exercises];
        updatedExercises[index] = replacement;

        set((state) => ({
          plansByDate: {
            ...state.plansByDate,
            [date]: {
              ...currentPlan,
              exercises: updatedExercises,
            },
          },
        }));
        return true;
      },

      clearPlanForDate: (date: string) => {
        set((state) => {
          const copy = { ...state.plansByDate };
          delete copy[date];
          return { plansByDate: copy };
        });
      },
    }),
    {
      name: 'zerocoach-workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.selectedDate = getTodayString();
        }
      },
    }
  )
);
