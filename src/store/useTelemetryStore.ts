import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalisthenicsStage,
  TelemetryMetrics,
  TelemetryPresetId,
  TelemetryState,
} from '@/types/telemetry';
import { calculateReadinessScore } from '@/services/telemetry/readinessCalculator';
import { healthAdapter } from '@/services/telemetry/healthConnectAdapter';
import { getPresetMetrics } from '@/services/telemetry/telemetryPresets';

const INITIAL_MANUAL_METRICS: TelemetryMetrics = {
  steps: 0,
  activeCalories: 0,
  restingHeartRate: 0,
  heartRateVariability: 0,
  sleepHours: 0,
  sleepQualityScore: 0,
  deepSleepHours: 0,
  readinessScore: 0,
  lastSyncTimestamp: 0,
  source: 'manual',
};

const DEFAULT_CALISTHENICS_STAGES: CalisthenicsStage[] = [
  // L-Sit progression
  {
    id: 'lsit-1',
    skillName: 'L-Sit',
    stageNumber: 1,
    stageTitle: 'Seated Floor Compression Tucks',
    standard: '3 sets of 30s continuous hold with active scapular depression',
    completed: true,
  },
  {
    id: 'lsit-2',
    skillName: 'L-Sit',
    stageNumber: 2,
    stageTitle: 'Parallettes Tuck L-Sit',
    standard: '3 sets of 20s hold with knees pulled tight to chest',
    completed: true,
  },
  {
    id: 'lsit-3',
    skillName: 'L-Sit',
    stageNumber: 3,
    stageTitle: 'One-Leg Extended L-Sit',
    standard: '3 sets of 15s per leg with pointed toes and locked quad',
    completed: false,
  },
  {
    id: 'lsit-4',
    skillName: 'L-Sit',
    stageNumber: 4,
    stageTitle: 'Full L-Sit on Floor/Parallettes',
    standard: '3 sets of 15s hold, hips aligned forward, no foot sag',
    completed: false,
  },
  {
    id: 'lsit-5',
    skillName: 'L-Sit',
    stageNumber: 5,
    stageTitle: 'V-Sit Compression Angle (>45°)',
    standard: '2 sets of 10s hold with legs elevated above parallel',
    completed: false,
  },

  // Muscle-Up progression
  {
    id: 'mu-1',
    skillName: 'Bar Muscle-Up',
    stageNumber: 1,
    stageTitle: 'Strict Chest-to-Bar Pull-Ups',
    standard: '3 sets of 8 strict reps with hollow body and no kipping',
    completed: true,
  },
  {
    id: 'mu-2',
    skillName: 'Bar Muscle-Up',
    stageNumber: 2,
    stageTitle: 'Explosive Sternum Pull-Ups',
    standard: '4 sets of 5 explosive reps pulling to lower ribcage',
    completed: false,
  },
  {
    id: 'mu-3',
    skillName: 'Bar Muscle-Up',
    stageNumber: 3,
    stageTitle: 'Straight-Bar Dips',
    standard: '3 sets of 10 deep reps touching lower chest to bar',
    completed: false,
  },
  {
    id: 'mu-4',
    skillName: 'Bar Muscle-Up',
    stageNumber: 4,
    stageTitle: 'Jumping Muscle-Up + 5s Slow Negative',
    standard: '4 sets of 3 reps with controlled eccentric descent',
    completed: false,
  },
  {
    id: 'mu-5',
    skillName: 'Bar Muscle-Up',
    stageNumber: 5,
    stageTitle: 'Strict Bar Muscle-Up (Zero Chicken-Wing)',
    standard: 'Clean turnover with simultaneous arm extension',
    completed: false,
  },
];

export const useTelemetryStore = create<TelemetryState>()(
  persist<TelemetryState>(
    (set, get) => ({
      metrics: INITIAL_MANUAL_METRICS,
      activePreset: 'manual',
      syncing: false,
      calisthenicsStages: DEFAULT_CALISTHENICS_STAGES,

      syncTelemetry: async () => {
        set({ syncing: true });
        try {
          const fresh = await healthAdapter.fetchLatestMetrics();
          set({ metrics: fresh, syncing: false });
        } catch (e) {
          console.warn('[TelemetryStore] Sync failed, maintaining cache:', e);
          set({ syncing: false });
        }
      },

      setManualTelemetry: (inputs: {
        sleepHours: number;
        sleepQualityScore: number;
        restingHeartRate: number;
        heartRateVariability?: number;
        steps: number;
        activeCalories: number;
        weightKg?: number;
        heightCm?: number;
      }) => {
        const hasRealMetrics = inputs.sleepHours > 0 || inputs.steps > 0 || inputs.activeCalories > 0;
        const hrv = inputs.heartRateVariability ?? 55;
        const readiness = hasRealMetrics
          ? calculateReadinessScore({
              sleepHours: inputs.sleepHours,
              sleepQualityScore: inputs.sleepQualityScore,
              restingHeartRate: inputs.restingHeartRate,
              heartRateVariability: hrv,
            })
          : 0;

        const newMetrics: TelemetryMetrics = {
          steps: inputs.steps,
          activeCalories: inputs.activeCalories,
          restingHeartRate: inputs.restingHeartRate,
          heartRateVariability: hasRealMetrics ? hrv : 0,
          sleepHours: inputs.sleepHours,
          sleepQualityScore: inputs.sleepQualityScore,
          deepSleepHours: Number((inputs.sleepHours * 0.22).toFixed(1)),
          readinessScore: readiness,
          lastSyncTimestamp: hasRealMetrics ? Date.now() : 0,
          source: 'manual',
          weightKg: inputs.weightKg,
          heightCm: inputs.heightCm,
        };

        set({
          metrics: newMetrics,
          activePreset: 'manual',
        });
      },

      applyPreset: (presetId: TelemetryPresetId) => {
        if (presetId === 'manual') {
          set({ activePreset: 'manual' });
          return;
        }
        const metrics = getPresetMetrics(presetId);
        set({ metrics, activePreset: presetId });
      },

      toggleStageCompletion: (stageId: string) => {
        set((state) => ({
          calisthenicsStages: state.calisthenicsStages.map((stage) =>
            stage.id === stageId
              ? { ...stage, completed: !stage.completed }
              : stage
          ),
        }));
      },

      updateMetric: (updates: Partial<TelemetryMetrics>) => {
        set((state) => ({
          metrics: { ...state.metrics, ...updates },
        }));
      },
    }),
    {
      name: 'zerocoach-telemetry-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
