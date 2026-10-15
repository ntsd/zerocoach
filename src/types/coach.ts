export type CoachingMode = 'strict' | 'comfortable';

export type TrainingGoal =
  | 'strength_hypertrophy'
  | 'calisthenics_mastery'
  | 'fat_loss_recomp'
  | 'cardio_endurance'
  | 'daily_health_longevity';

export type Sex = 'male' | 'female';
export type EquipmentPreference = 'gym' | 'home' | 'both';

export interface UserProfile {
  name: string;
  sex?: Sex;
  weightKg: number;
  heightCm: number;
  dailyCalorieTarget: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  primaryGoals: TrainingGoal[];
  primaryGoal?: string;
  currentCalisthenicsFocus?: string;
  equipmentPreference?: EquipmentPreference;
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
  clearUserData: () => void;
}
