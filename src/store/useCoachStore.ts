import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachState, UserProfile, SkillLevel, AppLanguage } from '@/types/coach';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  sex: 'male',
  equipmentPreference: 'both',
  skillLevel: 'intermediate',
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
      language: 'en',
      userProfile: DEFAULT_PROFILE,

      setLanguage: (language: AppLanguage) => set({ language }),

      setSkillLevel: (skillLevel: SkillLevel) =>
        set((state) => ({
          userProfile: { ...state.userProfile, skillLevel },
        })),

      updateProfile: (updates: Partial<UserProfile>) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...updates },
        })),

      completeOnboarding: (profile: UserProfile) =>
        set({
          userProfile: profile,
          hasCompletedOnboarding: true,
        }),

      resetOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
        }),

      clearUserData: () =>
        set({
          hasCompletedOnboarding: false,
          userProfile: DEFAULT_PROFILE,
        }),
    }),
    {
      name: 'zerocoach-coach-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
