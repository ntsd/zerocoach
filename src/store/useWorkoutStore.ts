import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedWorkoutSession, WorkoutDraftSession } from '@/types/history';

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
}

export const useWorkoutStore = create<WorkoutState>()(
  persist<WorkoutState>(
    (set, get) => ({
      selectedDate: getTodayString(),
      activeDraft: null,
      historyByDate: {},

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
