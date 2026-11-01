import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletedWorkoutSession, WorkoutDraftSession } from '@/types/history';
import {
  GeneratedWorkoutPlan,
  ExerciseItem,
  CoreWorkoutDayType,
} from '@/types/workout';

export const ALL_CYCLE_DAY_TYPES: CoreWorkoutDayType[] = [
  'push',
  'pull',
  'legs',
  'cardio',
  'rest',
];

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
  getWorkoutForDate: (date: string) => CompletedWorkoutSession | undefined;
  getRecentHistory: (daysCount: number) => CompletedWorkoutSession[];
  clearWorkoutHistory: () => void;

  // Schedule & Rolling Cycle Actions
  getScheduledSplitForDate: (date?: string) => CoreWorkoutDayType;
  setSplitForDate: (date: string, split: CoreWorkoutDayType) => void;
  skipWorkoutDay: (date?: string) => {
    skippedSplit: CoreWorkoutDayType;
    shiftedToDate: string;
  };
  skipRestDay: (date?: string) => {
    newSplit: CoreWorkoutDayType;
  };
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

      activeCycle: ['push', 'pull', 'legs', 'cardio', 'rest'],
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
        set({
          historyByDate: {},
          activeDraft: null,
          scheduleOverridesByDate: {},
        });
      },

      getScheduledSplitForDate: (date?: string): CoreWorkoutDayType => {
        const targetDate = date || getTodayString();
        const state = get();
        const overrides = state.scheduleOverridesByDate || {};
        if (overrides[targetDate]) {
          return overrides[targetDate];
        }

        const cycle =
          state.activeCycle && state.activeCycle.length > 0
            ? state.activeCycle
            : (['push', 'pull', 'legs', 'cardio', 'rest'] as CoreWorkoutDayType[]);
        const anchorDate = state.cycleAnchorDate || getTodayString();
        const anchorIdx = state.cycleAnchorIndex || 0;
        const diff = diffDaysBetweenDates(anchorDate, targetDate);
        const len = cycle.length;
        const idx = (((anchorIdx + diff) % len) + len) % len;
        return cycle[idx];
      },

      setSplitForDate: (date: string, split: CoreWorkoutDayType) => {
        const state = get();
        const cycle = state.activeCycle || ['push', 'pull', 'legs', 'cardio', 'rest'];
        const idxInCycle = cycle.indexOf(split);
        const nextOverrides = { ...(state.scheduleOverridesByDate || {}), [date]: split };
        const nextPlans = { ...(state.plansByDate || {}) };
        delete nextPlans[date];

        if (idxInCycle !== -1) {
          set({
            scheduleOverridesByDate: nextOverrides,
            cycleAnchorDate: date,
            cycleAnchorIndex: idxInCycle,
            plansByDate: nextPlans,
          });
        } else {
          set({
            scheduleOverridesByDate: nextOverrides,
            plansByDate: nextPlans,
          });
        }
      },

      skipWorkoutDay: (date?: string) => {
        const targetDate = date || getTodayString();
        const state = get();
        const currentSplit = state.getScheduledSplitForDate(targetDate);
        const cycle =
          state.activeCycle && state.activeCycle.length > 0
            ? state.activeCycle
            : (['push', 'pull', 'legs', 'cardio', 'rest'] as CoreWorkoutDayType[]);

        // Find the workout split we want to shift to tomorrow
        const workoutToShift: CoreWorkoutDayType =
          currentSplit === 'rest'
            ? cycle.find((c) => c !== 'rest') || 'push'
            : currentSplit;

        const shiftIdx = Math.max(0, cycle.indexOf(workoutToShift));
        const tomorrowDate = addDaysToDateString(targetDate, 1);

        const nextOverrides = {
          ...(state.scheduleOverridesByDate || {}),
          [targetDate]: 'rest' as CoreWorkoutDayType,
        };
        delete nextOverrides[tomorrowDate];

        const nextPlans = { ...(state.plansByDate || {}) };
        delete nextPlans[targetDate];

        set({
          scheduleOverridesByDate: nextOverrides,
          cycleAnchorDate: tomorrowDate,
          cycleAnchorIndex: shiftIdx,
          plansByDate: nextPlans,
        });

        return {
          skippedSplit: workoutToShift,
          shiftedToDate: tomorrowDate,
        };
      },

      skipRestDay: (date?: string) => {
        const targetDate = date || getTodayString();
        const state = get();
        const cycle =
          state.activeCycle && state.activeCycle.length > 0
            ? state.activeCycle
            : (['push', 'pull', 'legs', 'cardio', 'rest'] as CoreWorkoutDayType[]);

        const tomorrowDate = addDaysToDateString(targetDate, 1);
        const tomorrowSplit = state.getScheduledSplitForDate(tomorrowDate);
        const nextWorkoutSplit: CoreWorkoutDayType =
          tomorrowSplit !== 'rest'
            ? tomorrowSplit
            : cycle.find((c) => c !== 'rest') || 'push';

        const nextIdx = Math.max(0, cycle.indexOf(nextWorkoutSplit));
        const nextOverrides = {
          ...(state.scheduleOverridesByDate || {}),
          [targetDate]: nextWorkoutSplit,
        };
        delete nextOverrides[tomorrowDate];

        const nextPlans = { ...(state.plansByDate || {}) };
        delete nextPlans[targetDate];

        set({
          scheduleOverridesByDate: nextOverrides,
          cycleAnchorDate: targetDate,
          cycleAnchorIndex: nextIdx,
          plansByDate: nextPlans,
        });

        return {
          newSplit: nextWorkoutSplit,
        };
      },

      toggleCycleDayType: (dayType: CoreWorkoutDayType) => {
        const state = get();
        const current = state.activeCycle || ['push', 'pull', 'legs', 'cardio', 'rest'];
        let nextCycle: CoreWorkoutDayType[];

        if (current.includes(dayType)) {
          if (current.length <= 1) return current; // Keep at least 1 day type in cycle
          nextCycle = current.filter((d) => d !== dayType);
        } else {
          // Insert in canonical order: push -> pull -> legs -> cardio -> rest
          nextCycle = ALL_CYCLE_DAY_TYPES.filter(
            (d) => current.includes(d) || d === dayType
          );
        }

        set({
          activeCycle: nextCycle,
          cycleAnchorIndex: 0,
        });
        return nextCycle;
      },

      setActiveCycle: (cycle: CoreWorkoutDayType[]) => {
        const valid = ALL_CYCLE_DAY_TYPES.filter((d) => cycle.includes(d));
        if (valid.length === 0) return;
        set({
          activeCycle: valid,
          cycleAnchorIndex: 0,
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
