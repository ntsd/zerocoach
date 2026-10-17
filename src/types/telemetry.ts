export type TelemetrySource =
  | 'health_connect'
  | 'apple_health'
  | 'google_fit'
  | 'garmin'
  | 'xiaomi'
  | 'simulation'
  | 'manual';

export type TelemetryPresetId = 'optimal_recovery' | 'high_fatigue' | 'post_calisthenics' | 'balanced' | 'manual';

export interface TelemetryMetrics {
  steps: number;
  activeCalories: number;
  restingHeartRate: number; // bpm
  heartRateVariability: number; // ms (rMSSD)
  sleepHours: number;
  sleepQualityScore: number; // 0 - 100
  deepSleepHours: number;
  readinessScore: number; // 0 - 100 calculated
  lastSyncTimestamp: number;
  source: TelemetrySource;
  weightKg?: number;
  heightCm?: number;
}

export interface ProgressionStage {
  id: string;
  category: 'gym' | 'bodyweight';
  skillName: string;
  stageNumber: number;
  stageTitle: string;
  standard: string;
  completed: boolean;
  skipped?: boolean;
  isCustom?: boolean;
  notes?: string;
  equipment?: string;
}

export type CalisthenicsStage = ProgressionStage;

export interface TelemetryState {
  metrics: TelemetryMetrics;
  activePreset: TelemetryPresetId;
  syncing: boolean;
  syncError: string | null;
  calisthenicsStages: ProgressionStage[];
  syncTelemetry: () => Promise<void>;
  clearSyncError: () => void;
  applyPreset: (presetId: TelemetryPresetId) => void;
  setManualTelemetry: (inputs: {
    sleepHours: number;
    sleepQualityScore: number;
    restingHeartRate: number;
    heartRateVariability?: number;
    steps: number;
    activeCalories: number;
    weightKg?: number;
    heightCm?: number;
  }) => void;
  toggleStageCompletion: (stageId: string) => void;
  toggleStageSkipped: (stageId: string) => void;
  addCustomStage: (stage: Omit<ProgressionStage, 'id' | 'completed' | 'skipped'>) => void;
  deleteStage: (stageId: string) => void;
  updateMetric: (updates: Partial<TelemetryMetrics>) => void;
  clearTelemetryData: () => void;
}
