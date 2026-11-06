import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedWorkoutSession, WorkoutDraftSession } from '@/types/history';
import {
  GeneratedWorkoutPlan,
  ExerciseItem,
  CoreWorkoutDayType,
} from '@/types/workout';
import { getLocalDateString } from '@/utils/date';

export const ALL_CYCLE_DAY_TYPES: CoreWorkoutDayType[] = [
  'push',
  'pull',
  'legs',
  'cardio',
];

function sanitizeTrainingCycle(raw?: CoreWorkoutDayType[]): CoreWorkoutDayType[] {
  const filtered = (raw || []).filter(
    (d) => d === 'push' || d === 'pull' || d === 'legs' || d === 'cardio'
  );
  return filtered.length > 0 ? filtered : ['push', 'pull', 'legs', 'cardio'];
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateStr: string, daysToAdd: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1);
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function diffDaysBetweenDates(startDateStr: string, endDateStr: string): number {
  const [y1, m1, d1] = startDateStr.split('-').map(Number);
  const [y2, m2, d2] = endDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const utc2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export interface WorkoutState {
  selectedDate: string;
  activeDraft: WorkoutDraftSession | null;
  historyByDate: Record<string, CompletedWorkoutSession>;
  plansByDate: Record<string, GeneratedWorkoutPlan>;

  // Rolling Workout Cycle & Schedule State
  activeCycle: CoreWorkoutDayType[];
  cycleAnchorDate: string;
  cycleAnchorIndex: number;
  scheduleOverridesByDate: Record<string, CoreWorkoutDayType>;

  // Actions
  setSelectedDate: (date: string) => void;
  saveDraft: (draft: WorkoutDraftSession) => void;
  clearDraft: () => void;
  finishWorkout: (
    sessionData: Omit<CompletedWorkoutSession, 'id' | 'completedAt'>
  ) => CompletedWorkoutSession;
  removeWorkoutForDate: (date: string) => void;
  getWorkoutForDate: (date: string) => CompletedWorkoutSession | undefined;
  getRecentHistory: (daysCount: number) => CompletedWorkoutSession[];
  clearWorkoutHistory: () => void;

  // Schedule & Rolling Cycle Actions
  getScheduledSplitForDate: (date?: string) => CoreWorkoutDayType;
  getScheduledCycleStepForDate: (date?: string) => {
    split: CoreWorkoutDayType;
    cycleIndex: number;
    isOverride: boolean;
  };
  setActiveCycleStepForDate: (date: string, cycleIndex: number) => void;
  setSplitForDate: (date: string, split: CoreWorkoutDayType) => void;
  skipWorkoutDay: (date?: string) => {
    skippedSplit: CoreWorkoutDayType;
    shiftedToDate: string;
  };
  skipRestDay: (date?: string) => {
    newSplit: CoreWorkoutDayType;
  };
  appendCycleStep: (dayType: CoreWorkoutDayType) => CoreWorkoutDayType[];
  removeCycleStepAt: (index: number) => CoreWorkoutDayType[];
  toggleCycleDayType: (dayType: CoreWorkoutDayType) => CoreWorkoutDayType[];
  setActiveCycle: (cycle: CoreWorkoutDayType[]) => void;

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

      activeCycle: ['push', 'pull', 'legs', 'cardio'],
      cycleAnchorDate: getTodayString(),
      cycleAnchorIndex: 0,
      scheduleOverridesByDate: {},

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
          activeDraft: null,
        }));

        return completedSession;
      },

      removeWorkoutForDate: (date: string) => {
        set((state) => {
          if (!state.historyByDate[date]) return state;
          const nextHistory = { ...state.historyByDate };
          delete nextHistory[date];
          return {
            historyByDate: nextHistory,
            activeDraft:
              state.activeDraft?.date === date ? null : state.activeDraft,
          };
        });
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
          const dateStr = getLocalDateString(d);
          if (historyMap[dateStr]) {
            results.push(historyMap[dateStr]);
          }
        }

        return results;
      },

      clearWorkoutHistory: () => {
        set({
          historyByDate: {},
          activeDraft: null,
          scheduleOverridesByDate: {},
        });
      },

      getScheduledCycleStepForDate: (date?: string) => {
        const targetDate = date || getTodayString();
        const state = get();
        const cycle = sanitizeTrainingCycle(state.activeCycle);
        const anchorDate = state.cycleAnchorDate || getTodayString();
        const anchorIdx = state.cycleAnchorIndex || 0;
        const len = cycle.length;

        // If a workout was already completed on a past date, return its logged split if valid
        const loggedSession = (state.historyByDate || {})[targetDate];
        if (
          targetDate < getTodayString() &&
          loggedSession &&
          (loggedSession.split === 'push' ||
            loggedSession.split === 'pull' ||
            loggedSession.split === 'legs' ||
            loggedSession.split === 'cardio')
        ) {
          const loggedIdx = Math.max(0, cycle.indexOf(loggedSession.split));
          return {
            split: loggedSession.split,
            cycleIndex: loggedIdx,
            isOverride: false,
          };
        }

        // Completion-Driven Workout Queue:
        // Only advance the cycle index by the number of days with a completed workout!
        // Any day with 0 completed exercises is automatically a Rest Day and keeps the queue waiting.
        const historyKeys = Object.keys(state.historyByDate || {});
        let completedSteps = 0;
        if (targetDate >= anchorDate) {
          completedSteps = historyKeys.filter(
            (d) => d >= anchorDate && d < targetDate && (state.historyByDate[d]?.completedMovements || 0) > 0
          ).length;
        } else {
          completedSteps = -historyKeys.filter(
            (d) => d >= targetDate && d < anchorDate && (state.historyByDate[d]?.completedMovements || 0) > 0
          ).length;
        }

        const cycleIndex = (((anchorIdx + completedSteps) % len) + len) % len;

        const overrides = state.scheduleOverridesByDate || {};
        if (overrides[targetDate] && overrides[targetDate] !== 'rest') {
          return {
            split: overrides[targetDate],
            cycleIndex,
            isOverride: true,
          };
        }

        return {
          split: cycle[cycleIndex],
          cycleIndex,
          isOverride: false,
        };
      },

      getScheduledSplitForDate: (date?: string): CoreWorkoutDayType => {
        return get().getScheduledCycleStepForDate(date).split;
      },

      setActiveCycleStepForDate: (date: string, cycleIndex: number) => {
        const state = get();
        const cycle = sanitizeTrainingCycle(state.activeCycle);
        const clampedIdx = Math.max(0, Math.min(cycle.length - 1, cycleIndex));
        const targetSplit = cycle[clampedIdx];

        const nextOverrides = { ...(state.scheduleOverridesByDate || {}) };
        delete nextOverrides[date];

        const nextPlans = { ...(state.plansByDate || {}) };
        const existingPlan = nextPlans[date];
        if (existingPlan && existingPlan.selectedSplit !== targetSplit) {
          delete nextPlans[date];
        }

        set({
          activeCycle: cycle,
          scheduleOverridesByDate: nextOverrides,
          cycleAnchorDate: date,
          cycleAnchorIndex: clampedIdx,
          plansByDate: nextPlans,
        });
      },

      setSplitForDate: (date: string, split: CoreWorkoutDayType) => {
        if (split === 'rest') return;
        const state = get();
        const cycle = sanitizeTrainingCycle(state.activeCycle);
        const idxInCycle = cycle.indexOf(split);
        const nextOverrides = { ...(state.scheduleOverridesByDate || {}), [date]: split };
        const nextPlans = { ...(state.plansByDate || {}) };
        const existingPlan = nextPlans[date];
        if (existingPlan && existingPlan.selectedSplit !== split) {
          delete nextPlans[date];
        }

        if (idxInCycle !== -1) {
          delete nextOverrides[date];
          set({
            activeCycle: cycle,
            scheduleOverridesByDate: nextOverrides,
            cycleAnchorDate: date,
            cycleAnchorIndex: idxInCycle,
            plansByDate: nextPlans,
          });
        } else {
          set({
            activeCycle: cycle,
            scheduleOverridesByDate: nextOverrides,
            plansByDate: nextPlans,
          });
        }
      },

      skipWorkoutDay: (date?: string) => {
        // With the Completion-Driven Queue, not logging a workout on `date` automatically makes `date` a Rest Day
        // and keeps the current workout step ready for tomorrow.
        const targetDate = date || getTodayString();
        const state = get();
        const step = state.getScheduledCycleStepForDate(targetDate);
        const tomorrowDate = addDaysToDateString(targetDate, 1);

        // Clear any logged workout on targetDate if the user explicitly asks to rest today
        const nextHistory = { ...(state.historyByDate || {}) };
        delete nextHistory[targetDate];

        set({
          historyByDate: nextHistory,
          cycleAnchorDate: targetDate,
          cycleAnchorIndex: step.cycleIndex,
        });

        return {
          skippedSplit: step.split,
          shiftedToDate: tomorrowDate,
        };
      },

      skipRestDay: (date?: string) => {
        const targetDate = date || getTodayString();
        const state = get();
        const step = state.getScheduledCycleStepForDate(targetDate);
        return {
          newSplit: step.split,
        };
      },

      appendCycleStep: (dayType: CoreWorkoutDayType) => {
        if (dayType === 'rest') return sanitizeTrainingCycle(get().activeCycle);
        const state = get();
        const current = sanitizeTrainingCycle(state.activeCycle);
        const nextCycle = [...current, dayType];
        set({
          activeCycle: nextCycle,
        });
        return nextCycle;
      },

      removeCycleStepAt: (index: number) => {
        const state = get();
        const current = sanitizeTrainingCycle(state.activeCycle);
        if (current.length <= 1) return current; // Keep at least 1 step
        const nextCycle = current.filter((_, idx) => idx !== index);
        const nextAnchorIdx = Math.min(state.cycleAnchorIndex || 0, nextCycle.length - 1);
        set({
          activeCycle: nextCycle,
          cycleAnchorIndex: Math.max(0, nextAnchorIdx),
        });
        return nextCycle;
      },

      toggleCycleDayType: (dayType: CoreWorkoutDayType) => {
        if (dayType === 'rest') return sanitizeTrainingCycle(get().activeCycle);
        const state = get();
        const current = sanitizeTrainingCycle(state.activeCycle);
        let nextCycle: CoreWorkoutDayType[];

        if (current.includes(dayType)) {
          const filtered = current.filter((d) => d !== dayType);
          if (filtered.length === 0) return current;
          nextCycle = filtered;
        } else {
          nextCycle = [...current, dayType];
        }

        set({
          activeCycle: nextCycle,
          cycleAnchorIndex: 0,
        });
        return nextCycle;
      },

      setActiveCycle: (cycle: CoreWorkoutDayType[]) => {
        const valid = sanitizeTrainingCycle(cycle);
        set({
          activeCycle: valid,
          cycleAnchorDate: getTodayString(),
          cycleAnchorIndex: 0,
          scheduleOverridesByDate: {},
        });
      },

      getPlanForDate: (date: string) => {
        return (get().plansByDate || {})[date];
      },

      savePlanForDate: (date: string, plan: GeneratedWorkoutPlan) => {
        set((state) => ({
          plansByDate: {
            ...(state.plansByDate || {}),
            [date]: plan,
          },
        }));
      },

      updatePlanExercises: (date: string, exercises: ExerciseItem[]) => {
        const currentPlan = (get().plansByDate || {})[date];
        if (currentPlan) {
          set((state) => ({
            plansByDate: {
              ...(state.plansByDate || {}),
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
        const currentPlan = (get().plansByDate || {})[date];
        if (!currentPlan) return false;
        const index = currentPlan.exercises.findIndex((ex) => ex.id === targetExerciseId);
        if (index === -1) return false;

        const updatedExercises = [...currentPlan.exercises];
        updatedExercises[index] = replacement;

        set((state) => ({
          plansByDate: {
            ...(state.plansByDate || {}),
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
          const copy = { ...(state.plansByDate || {}) };
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
          if (!state.plansByDate || typeof state.plansByDate !== 'object') {
            state.plansByDate = {};
          }
          if (!state.historyByDate || typeof state.historyByDate !== 'object') {
            state.historyByDate = {};
          }
          if (!Array.isArray(state.activeCycle) || state.activeCycle.length === 0) {
            state.activeCycle = ['push', 'pull', 'legs', 'cardio', 'rest'];
          }
          if (!state.cycleAnchorDate) {
            state.cycleAnchorDate = getTodayString();
          }
          if (!state.scheduleOverridesByDate || typeof state.scheduleOverridesByDate !== 'object') {
            state.scheduleOverridesByDate = {};
          }
        }
      },
      merge: (persistedState: any, currentState: any) => ({
        ...currentState,
        ...(persistedState || {}),
        historyByDate: persistedState?.historyByDate || {},
        plansByDate: persistedState?.plansByDate || {},
        activeCycle:
          Array.isArray(persistedState?.activeCycle) && persistedState.activeCycle.length > 0
            ? persistedState.activeCycle
            : ['push', 'pull', 'legs', 'cardio', 'rest'],
        cycleAnchorDate: persistedState?.cycleAnchorDate || getTodayString(),
        cycleAnchorIndex: persistedState?.cycleAnchorIndex || 0,
        scheduleOverridesByDate: persistedState?.scheduleOverridesByDate || {},
        selectedDate: getTodayString(),
      }),
    }
  )
);
