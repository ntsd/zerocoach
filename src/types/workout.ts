import { CoachingMode, TrainingGoal, SkillLevel } from './coach';

export type ExerciseCategory = 'warmup' | 'skill' | 'strength' | 'metabolic' | 'cooldown';

export type WorkoutSplit =
  | 'full_body'
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'core_mobility'
  | 'calisthenics_skills'
  | 'cardio_engine';

export interface CoachSplitRecommendation {
  recommendedSplit: WorkoutSplit;
  splitTitle: string;
  badge: string;
  headline: string;
  reasoning: string;
  focusMuscles?: string[];
}

export interface ExerciseItem {
  id: string;
  name: string;
  category: ExerciseCategory;
  targetSets: number;
  targetReps: string;
  restPeriodSeconds: number;
  intensityNote: string;
  coachingCue: string;
  completed?: boolean;
  skipped?: boolean;
  isCustomAdded?: boolean;
  equipment?: string;
  bodyPart?: string;
  primaryMuscles?: string[];
  mechanic?: string;
  difficulty?: string;
  isBodyweight?: boolean;
  met?: number;
  imageUrl?: string;
  imageStartUrl?: string;
  imagePeakUrl?: string;
  instructions?: string[];
  secondaryMuscles?: string[];
  forceType?: string;
  tips?: string[];
}

export type WorkoutIntensityTier = 'peak' | 'optimal' | 'deload' | 'baseline';

export interface GeneratedWorkoutPlan {
  id: string;
  title: string;
  focusSummary: string;
  tier: WorkoutIntensityTier;
  tierLabel: string;
  readinessMultiplierDesc: string;
  estimatedDurationMin: number;
  estimatedCaloriesBurn?: number;
  equipmentMode?: 'all' | 'bodyweight';
  targetSkillMilestone?: string;
  exercises: ExerciseItem[];
  coachingNotes: string;
  generatedDate: string;
  sourceAttribution?: string;
  skillLevel?: SkillLevel;
  selectedSplit?: WorkoutSplit;
  coachRecommendation?: CoachSplitRecommendation;
}
