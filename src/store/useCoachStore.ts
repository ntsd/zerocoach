import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachState, CoachingMode, UserProfile } from '@/types/coach';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Athlete',
  weightKg: 74,
  heightCm: 178,
  dailyCalorieTarget: 2800,
  proteinGrams: 170,
  carbsGrams: 320,
  fatGrams: 65,
  primaryGoals: ['calisthenics_mastery', 'strength_hypertrophy'],
};

export const useCoachStore = create<CoachState>()(
  persist<CoachState>(
    (set) => ({
      hasCompletedOnboarding: false,
      mode: 'strict',
      userProfile: DEFAULT_PROFILE,

      toggleMode: () =>
        set((state) => ({
          mode: state.mode === 'strict' ? 'comfortable' : 'strict',
        })),

      setMode: (mode: CoachingMode) => set({ mode }),

      updateProfile: (updates: Partial<UserProfile>) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...updates },
        })),

      completeOnboarding: (profile: UserProfile, mode: CoachingMode) =>
        set({
          userProfile: profile,
          mode,
          hasCompletedOnboarding: true,
        }),

      resetOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
        }),
    }),
    {
      name: 'zerocoach-coach-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
