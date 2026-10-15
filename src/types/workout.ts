import { CoachingMode, TrainingGoal } from './coach';

export type ExerciseCategory = 'warmup' | 'skill' | 'strength' | 'metabolic' | 'cooldown';

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
  equipment?: string;
  bodyPart?: string;
  primaryMuscles?: string[];
  mechanic?: string;
  difficulty?: string;
  isBodyweight?: boolean;
  met?: number;
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
}
