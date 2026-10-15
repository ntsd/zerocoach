export type CoachingMode = 'strict' | 'comfortable';

export type TrainingGoal =
  | 'strength_hypertrophy'
  | 'calisthenics_mastery'
  | 'fat_loss_recomp'
  | 'cardio_endurance'
  | 'daily_health_longevity';

export interface UserProfile {
  name: string;
  weightKg: number;
  heightCm: number;
  dailyCalorieTarget: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  primaryGoals: TrainingGoal[];
  primaryGoal?: string;
  currentCalisthenicsFocus?: string;
}

export interface CoachState {
  hasCompletedOnboarding: boolean;
  mode: CoachingMode;
  userProfile: UserProfile;
  toggleMode: () => void;
  setMode: (mode: CoachingMode) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: (profile: UserProfile, mode: CoachingMode) => void;
  resetOnboarding: () => void;
}
