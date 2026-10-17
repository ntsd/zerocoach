import { ExerciseItem, WorkoutSplit, WorkoutIntensityTier } from './workout';

export interface CompletedWorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  planId: string;
  title: string;
  split: WorkoutSplit;
  tier: WorkoutIntensityTier;
  exercises: ExerciseItem[];
  completedExerciseIds: string[];
  skippedExerciseIds: string[];
  totalMovements: number;
  completedMovements: number;
  totalSets: number;
  durationMinutes: number;
  caloriesBurned: number;
  startedAt: number;
  completedAt: number;
}

export interface WorkoutDraftSession {
  date: string; // YYYY-MM-DD
  planId: string;
  exercises: ExerciseItem[];
  completedExercises: Record<string, boolean>;
  skippedExercises: Record<string, boolean>;
  startedAt: number;
  lastUpdatedAt: number;
}

export interface TelemetryDailySnapshot {
  date: string; // YYYY-MM-DD
  readinessScore: number;
  sleepHours: number;
  deepSleepHours: number;
  sleepQualityScore: number;
  restingHeartRate: number;
  heartRateVariability: number;
  steps: number;
  activeCalories: number;
  weightKg?: number;
  timestamp: number;
}

export interface DailyAggregateScore {
  date: string; // YYYY-MM-DD
  overallScore: number; // 0–100 composite
  recoveryScore: number; // 0–100
  workoutScore: number; // 0–100
  nutritionScore: number; // 0–100
  hasTelemetry: boolean;
  hasWorkout: boolean;
  hasNutrition: boolean;
  notes?: string[];
}

export type TimeRangeFilter = '7D' | '14D' | '30D';
