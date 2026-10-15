import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachState, CoachingMode, UserProfile } from '@/types/coach';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  weightKg: 0,
  heightCm: 0,
  dailyCalorieTarget: 0,
  proteinGrams: 0,
  carbsGrams: 0,
  fatGrams: 0,
  primaryGoals: [],
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

      clearUserData: () =>
        set({
          hasCompletedOnboarding: false,
          mode: 'strict',
          userProfile: DEFAULT_PROFILE,
        }),
    }),
    {
      name: 'zerocoach-coach-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
