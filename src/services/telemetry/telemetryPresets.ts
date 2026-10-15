import { TelemetryMetrics, TelemetryPresetId } from '@/types/telemetry';
import { calculateReadinessScore } from './readinessCalculator';

export const TELEMETRY_PRESETS: Record<
  TelemetryPresetId,
  {
    name: string;
    description: string;
    metrics: Omit<TelemetryMetrics, 'readinessScore' | 'lastSyncTimestamp'>;
  }
> = {
  optimal_recovery: {
    name: 'Optimal Peak Recovery',
    description: 'Deep restorative 8.2h sleep, low 48 bpm RHR, elevated HRV (78ms). Ready for PRs.',
    metrics: {
      steps: 4200,
      activeCalories: 450,
      restingHeartRate: 48,
      heartRateVariability: 78,
      sleepHours: 8.2,
      sleepQualityScore: 92,
      deepSleepHours: 2.3,
      source: 'garmin',
    },
  },
  balanced: {
    name: 'Balanced Daily State',
    description: 'Standard 7.3h sleep, 54 bpm RHR, moderate activity. Standard training capacity.',
    metrics: {
      steps: 8640,
      activeCalories: 620,
      restingHeartRate: 54,
      heartRateVariability: 58,
      sleepHours: 7.3,
      sleepQualityScore: 78,
      deepSleepHours: 1.6,
      source: 'google_fit',
    },
  },
  high_fatigue: {
    name: 'High Fatigue / Poor Sleep',
    description: 'Fragmented 4.8h sleep, elevated 64 bpm RHR, depressed HRV (32ms). Demands deload.',
    metrics: {
      steps: 2800,
      activeCalories: 210,
      restingHeartRate: 64,
      heartRateVariability: 32,
      sleepHours: 4.8,
      sleepQualityScore: 44,
      deepSleepHours: 0.6,
      source: 'xiaomi',
    },
  },
  post_calisthenics: {
    name: 'Post-Workout Heavy Strain',
    description: '14,200 steps, 920 active kcal, intense muscle breakdown, steady 52 bpm RHR.',
    metrics: {
      steps: 14200,
      activeCalories: 920,
      restingHeartRate: 52,
      heartRateVariability: 62,
      sleepHours: 7.6,
      sleepQualityScore: 84,
      deepSleepHours: 1.9,
      source: 'garmin',
    },
  },
  manual: {
    name: 'Manual Biometric Log',
    description: 'Direct manual metrics without wearable app sync.',
    metrics: {
      steps: 0,
      activeCalories: 0,
      restingHeartRate: 55,
      heartRateVariability: 55,
      sleepHours: 7.5,
      sleepQualityScore: 75,
      deepSleepHours: 1.6,
      source: 'manual',
    },
  },
};

export function getPresetMetrics(presetId: TelemetryPresetId): TelemetryMetrics {
  const preset = TELEMETRY_PRESETS[presetId];
  const readiness = calculateReadinessScore({
    sleepHours: preset.metrics.sleepHours,
    sleepQualityScore: preset.metrics.sleepQualityScore,
    restingHeartRate: preset.metrics.restingHeartRate,
    heartRateVariability: preset.metrics.heartRateVariability,
  });

  return {
    ...preset.metrics,
    readinessScore: readiness,
    lastSyncTimestamp: Date.now(),
  };
}
