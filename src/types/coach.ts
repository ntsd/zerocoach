export type CoachingMode = 'strict' | 'comfortable';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

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
  skillLevel?: SkillLevel;
  selectedWorkoutSplit?: string;
}

export type AppLanguage = 'en' | 'th';

export interface CoachState {
  hasCompletedOnboarding: boolean;
  mode: CoachingMode;
  language: AppLanguage;
  userProfile: UserProfile;
  toggleMode: () => void;
  setMode: (mode: CoachingMode) => void;
  setLanguage: (language: AppLanguage) => void;
  setSkillLevel: (level: SkillLevel) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: (profile: UserProfile, mode: CoachingMode) => void;
  resetOnboarding: () => void;
  clearUserData: () => void;
}

