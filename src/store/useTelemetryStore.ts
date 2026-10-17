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
import { fitnessBridge } from '@/services/telemetry/fitnessBridgeService';
import { getPresetMetrics } from '@/services/telemetry/telemetryPresets';
import { useCoachStore } from '@/store/useCoachStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import { calculateSmartNutrition } from '@/services/nutrition/nutritionCalculator';
import { TelemetryDailySnapshot } from '@/types/history';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

import { ProgressionStage } from '@/types/telemetry';

export const DEFAULT_PROGRESSION_STAGES: ProgressionStage[] = [
  // 1. Full Gym Benchmarks: Barbell Bench Press
  {
    id: 'bench-1',
    category: 'gym',
    skillName: 'Barbell Bench Press',
    stageNumber: 1,
    stageTitle: 'Push-Up Mechanical Mastery',
    standard: '3 sets of 15 strict reps with full chest contact and locked lockout',
    completed: false,
    equipment: 'barbell',
  },
  {
    id: 'bench-2',
    category: 'gym',
    skillName: 'Barbell Bench Press',
    stageNumber: 2,
    stageTitle: 'Dumbbell Bench Press Stability',
    standard: '3 sets of 10 reps with dumbbells (~50% bodyweight combined)',
    completed: false,
    equipment: 'dumbbell',
  },
  {
    id: 'bench-3',
    category: 'gym',
    skillName: 'Barbell Bench Press',
    stageNumber: 3,
    stageTitle: 'Barbell Bench Press Baseline (0.75x BW)',
    standard: '3 sets of 8 reps with controlled 3-second descent and clean bar path',
    completed: false,
    equipment: 'barbell',
  },
  {
    id: 'bench-4',
    category: 'gym',
    skillName: 'Barbell Bench Press',
    stageNumber: 4,
    stageTitle: 'Bodyweight Bench Press Mastery (1.0x BW)',
    standard: '3 sets of 5 reps paused at sternum with zero bounce',
    completed: false,
    equipment: 'barbell',
  },
  {
    id: 'bench-5',
    category: 'gym',
    skillName: 'Barbell Bench Press',
    stageNumber: 5,
    stageTitle: 'Heavy Strength Overload (1.25x BW)',
    standard: '3 sets of 3 explosive reps with leg drive and retracted scapulae',
    completed: false,
    equipment: 'barbell',
  },

  // 2. Full Gym Benchmarks: Barbell Back Squat
  {
    id: 'squat-1',
    category: 'gym',
    skillName: 'Barbell Back Squat',
    stageNumber: 1,
    stageTitle: 'Deep Bodyweight Squat Mobility',
    standard: '3 sets of 20 full-depth reps below parallel with upright torso',
    completed: false,
    equipment: 'bodyweight',
  },
  {
    id: 'squat-2',
    category: 'gym',
    skillName: 'Barbell Back Squat',
    stageNumber: 2,
    stageTitle: 'Dumbbell Goblet Squat Anchor',
    standard: '3 sets of 12 reps with 30% bodyweight dumbbell held at chest',
    completed: false,
    equipment: 'dumbbell',
  },
  {
    id: 'squat-3',
    category: 'gym',
    skillName: 'Barbell Back Squat',
    stageNumber: 3,
    stageTitle: 'Barbell Squat Baseline (1.0x BW)',
    standard: '3 sets of 8 strict reps with hip crease below patella',
    completed: false,
    equipment: 'barbell',
  },
  {
    id: 'squat-4',
    category: 'gym',
    skillName: 'Barbell Back Squat',
    stageNumber: 4,
    stageTitle: 'Barbell Squat Mastery (1.25x BW)',
    standard: '3 sets of 5 reps with braced intra-abdominal pressure',
    completed: false,
    equipment: 'barbell',
  },

  // 3. Full Gym Benchmarks: Bent-Over Barbell Row
  {
    id: 'row-1',
    category: 'gym',
    skillName: 'Barbell Bent-Over Row',
    stageNumber: 1,
    stageTitle: 'Inverted Bodyweight Row',
    standard: '3 sets of 12 horizontal pulls touching chest to bar',
    completed: false,
    equipment: 'bodyweight',
  },
  {
    id: 'row-2',
    category: 'gym',
    skillName: 'Barbell Bent-Over Row',
    stageNumber: 2,
    stageTitle: 'Single-Arm Dumbbell Row Control',
    standard: '3 sets of 10 reps per arm with flat lumbar spine and elbow drive',
    completed: false,
    equipment: 'dumbbell',
  },
  {
    id: 'row-3',
    category: 'gym',
    skillName: 'Barbell Bent-Over Row',
    stageNumber: 3,
    stageTitle: 'Barbell Row Benchmark (0.75x BW)',
    standard: '3 sets of 8 strict reps pulling to lower ribcage with zero momentum',
    completed: false,
    equipment: 'barbell',
  },

  // 4. Bodyweight & Calisthenics: Push-Up & Dips
  {
    id: 'push-1',
    category: 'bodyweight',
    skillName: 'Push-Up & Dip Mastery',
    stageNumber: 1,
    stageTitle: 'Strict Bodyweight Push-Ups',
    standard: '3 sets of 20 clean reps with locked core and full lockout',
    completed: false,
    equipment: 'bodyweight',
  },
  {
    id: 'push-2',
    category: 'bodyweight',
    skillName: 'Push-Up & Dip Mastery',
    stageNumber: 2,
    stageTitle: 'Diamond Push-Ups',
    standard: '3 sets of 12 reps focusing on triceps and anterior deltoid',
    completed: false,
    equipment: 'bodyweight',
  },
  {
    id: 'push-3',
    category: 'bodyweight',
    skillName: 'Push-Up & Dip Mastery',
    stageNumber: 3,
    stageTitle: 'Parallel Bar Dips',
    standard: '3 sets of 10 full-range dips with 90° elbow flexion',
    completed: false,
    equipment: 'dip_bars',
  },

  // 5. Bodyweight & Calisthenics: Pull-Up & Muscle-Up
  {
    id: 'mu-1',
    category: 'bodyweight',
    skillName: 'Pull-Up & Muscle-Up',
    stageNumber: 1,
    stageTitle: 'Strict Chest-to-Bar Pull-Ups',
    standard: '3 sets of 8 strict reps with hollow body and no kipping',
    completed: false,
    equipment: 'pullup_bar',
  },
  {
    id: 'mu-2',
    category: 'bodyweight',
    skillName: 'Pull-Up & Muscle-Up',
    stageNumber: 2,
    stageTitle: 'Explosive Sternum Pull-Ups',
    standard: '4 sets of 5 explosive reps pulling to lower ribcage',
    completed: false,
    equipment: 'pullup_bar',
  },
  {
    id: 'mu-3',
    category: 'bodyweight',
    skillName: 'Pull-Up & Muscle-Up',
    stageNumber: 3,
    stageTitle: 'Straight-Bar Dips',
    standard: '3 sets of 10 deep reps touching lower chest to bar',
    completed: false,
    equipment: 'pullup_bar',
  },
  {
    id: 'mu-4',
    category: 'bodyweight',
    skillName: 'Pull-Up & Muscle-Up',
    stageNumber: 4,
    stageTitle: 'Jumping Muscle-Up + 5s Slow Negative',
    standard: '4 sets of 3 reps with controlled eccentric descent',
    completed: false,
    equipment: 'pullup_bar',
  },
  {
    id: 'mu-5',
    category: 'bodyweight',
    skillName: 'Pull-Up & Muscle-Up',
    stageNumber: 5,
    stageTitle: 'Strict Bar Muscle-Up (Zero Chicken-Wing)',
    standard: 'Clean turnover with simultaneous arm extension',
    completed: false,
    equipment: 'pullup_bar',
  },

  // 6. Bodyweight & Calisthenics: Core & L-Sit
  {
    id: 'lsit-1',
    category: 'bodyweight',
    skillName: 'Core & L-Sit',
    stageNumber: 1,
    stageTitle: 'Seated Floor Compression Tucks',
    standard: '3 sets of 30s continuous hold with active scapular depression',
    completed: false,
    equipment: 'bodyweight',
  },
  {
    id: 'lsit-2',
    category: 'bodyweight',
    skillName: 'Core & L-Sit',
    stageNumber: 2,
    stageTitle: 'Parallettes Tuck L-Sit',
    standard: '3 sets of 20s hold with knees pulled tight to chest',
    completed: false,
    equipment: 'parallettes',
  },
  {
    id: 'lsit-3',
    category: 'bodyweight',
    skillName: 'Core & L-Sit',
    stageNumber: 3,
    stageTitle: 'One-Leg Extended L-Sit',
    standard: '3 sets of 15s per leg with pointed toes and locked quad',
    completed: false,
    equipment: 'parallettes',
  },
  {
    id: 'lsit-4',
    category: 'bodyweight',
    skillName: 'Core & L-Sit',
    stageNumber: 4,
    stageTitle: 'Full L-Sit on Floor/Parallettes',
    standard: '3 sets of 15s hold, hips aligned forward, no foot sag',
    completed: false,
    equipment: 'parallettes',
  },
  {
    id: 'lsit-5',
    category: 'bodyweight',
    skillName: 'Core & L-Sit',
    stageNumber: 5,
    stageTitle: 'V-Sit Compression Angle (>45°)',
    standard: '2 sets of 10s hold with legs elevated above parallel',
    completed: false,
    equipment: 'parallettes',
  },
];

export const useTelemetryStore = create<TelemetryState>()(
  persist<TelemetryState>(
    (set, get) => ({
      metrics: INITIAL_MANUAL_METRICS,
      telemetryHistoryByDate: {},
      activePreset: 'manual',
      syncing: false,
      syncError: null,
      calisthenicsStages: DEFAULT_PROGRESSION_STAGES,

      clearSyncError: () => set({ syncError: null }),

      syncTelemetry: async () => {
        set({ syncing: true, syncError: null });
        try {
          const fresh = await fitnessBridge.fetchLiveBiometrics();
          const coachStore = useCoachStore.getState();
          const currentProfile = coachStore.userProfile;

          // Preserve manually entered profile weight/height if Health Connect does not provide them
          if (!fresh.weightKg && currentProfile?.weightKg) {
            fresh.weightKg = currentProfile.weightKg;
          }
          if (!fresh.heightCm && currentProfile?.heightCm) {
            fresh.heightCm = currentProfile.heightCm;
          }

          const today = getTodayString();
          const snapshot: TelemetryDailySnapshot = {
            date: today,
            readinessScore: fresh.readinessScore,
            sleepHours: fresh.sleepHours,
            deepSleepHours: fresh.deepSleepHours,
            sleepQualityScore: fresh.sleepQualityScore,
            restingHeartRate: fresh.restingHeartRate,
            heartRateVariability: fresh.heartRateVariability,
            steps: fresh.steps,
            activeCalories: fresh.activeCalories,
            weightKg: fresh.weightKg,
            timestamp: Date.now(),
          };

          set((state) => ({
            metrics: fresh,
            syncing: false,
            syncError: null,
            telemetryHistoryByDate: {
              ...state.telemetryHistoryByDate,
              [today]: snapshot,
            },
          }));

          // Auto-update weight & height and recalculate smart nutrition targets
          const profileUpdates: any = {};

          if (fresh.weightKg && fresh.weightKg > 0 && currentProfile?.weightKg !== fresh.weightKg) {
            profileUpdates.weightKg = fresh.weightKg;
          }
          if (fresh.heightCm && fresh.heightCm > 0 && currentProfile?.heightCm !== fresh.heightCm) {
            profileUpdates.heightCm = fresh.heightCm;
          }

          if (Object.keys(profileUpdates).length > 0) {
            coachStore.updateProfile(profileUpdates);
          }

          const effectiveWeight = fresh.weightKg && fresh.weightKg > 0 ? fresh.weightKg : (currentProfile?.weightKg || 75);
          const effectiveHeight = fresh.heightCm && fresh.heightCm > 0 ? fresh.heightCm : (currentProfile?.heightCm || 175);

          if (effectiveWeight > 0 && effectiveHeight > 0) {
            // Recalculate smart nutrition with fresh weight/height and active burn
            const newNutrition = calculateSmartNutrition({
              weightKg: effectiveWeight,
              heightCm: effectiveHeight,
              mode: coachStore.mode,
              goals: currentProfile?.primaryGoals || [],
              activeCaloriesBurned: fresh.activeCalories,
              sex: currentProfile?.sex,
            });

            if (newNutrition.dailyCalories > 0) {
              coachStore.updateProfile({
                dailyCalorieTarget: newNutrition.dailyCalories,
                proteinGrams: newNutrition.proteinGrams,
                carbsGrams: newNutrition.carbsGrams,
                fatGrams: newNutrition.fatGrams,
              });

              // Sync targets to useNutritionStore
              useNutritionStore.getState().updateDailyTargets({
                targetCalories: newNutrition.dailyCalories,
                targetProtein: newNutrition.proteinGrams,
                targetCarbs: newNutrition.carbsGrams,
                targetFat: newNutrition.fatGrams,
              });
            }
          }
        } catch (e: any) {
          console.warn('[TelemetryStore] Sync failed, maintaining cache:', e);
          set({
            syncing: false,
            syncError:
              e?.message ||
              'No fitness app detected on this device. Data remains un-synced.',
          });
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

        const today = getTodayString();
        const snapshot: TelemetryDailySnapshot = {
          date: today,
          readinessScore: readiness,
          sleepHours: inputs.sleepHours,
          deepSleepHours: Number((inputs.sleepHours * 0.22).toFixed(1)),
          sleepQualityScore: inputs.sleepQualityScore,
          restingHeartRate: inputs.restingHeartRate,
          heartRateVariability: hasRealMetrics ? hrv : 0,
          steps: inputs.steps,
          activeCalories: inputs.activeCalories,
          weightKg: inputs.weightKg,
          timestamp: Date.now(),
        };

        set((state) => ({
          metrics: newMetrics,
          activePreset: 'manual',
          telemetryHistoryByDate: {
            ...state.telemetryHistoryByDate,
            [today]: snapshot,
          },
        }));
      },

      applyPreset: (presetId: TelemetryPresetId) => {
        if (presetId === 'manual') {
          set({ activePreset: 'manual' });
          return;
        }
        const metrics = getPresetMetrics(presetId);
        const today = getTodayString();
        const snapshot: TelemetryDailySnapshot = {
          date: today,
          readinessScore: metrics.readinessScore,
          sleepHours: metrics.sleepHours,
          deepSleepHours: metrics.deepSleepHours,
          sleepQualityScore: metrics.sleepQualityScore,
          restingHeartRate: metrics.restingHeartRate,
          heartRateVariability: metrics.heartRateVariability,
          steps: metrics.steps,
          activeCalories: metrics.activeCalories,
          weightKg: metrics.weightKg,
          timestamp: Date.now(),
        };

        set((state) => ({
          metrics,
          activePreset: presetId,
          telemetryHistoryByDate: {
            ...state.telemetryHistoryByDate,
            [today]: snapshot,
          },
        }));
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

      toggleStageSkipped: (stageId: string) => {
        set((state) => ({
          calisthenicsStages: state.calisthenicsStages.map((stage) =>
            stage.id === stageId
              ? { ...stage, skipped: !stage.skipped }
              : stage
          ),
        }));
      },

      addCustomStage: (stageData: Omit<ProgressionStage, 'id' | 'completed' | 'skipped'>) => {
        const id = `custom-stage-${Date.now()}`;
        const newStage: ProgressionStage = {
          ...stageData,
          id,
          completed: false,
          skipped: false,
          isCustom: true,
        };
        set((state) => ({
          calisthenicsStages: [newStage, ...state.calisthenicsStages],
        }));
      },

      deleteStage: (stageId: string) => {
        set((state) => ({
          calisthenicsStages: state.calisthenicsStages.filter((stage) => stage.id !== stageId),
        }));
      },

      updateMetric: (updates: Partial<TelemetryMetrics>) => {
        set((state) => ({
          metrics: { ...state.metrics, ...updates },
        }));
      },

      getTelemetryForDate: (date: string) => {
        return get().telemetryHistoryByDate[date];
      },

      clearTelemetryData: () => {
        set({
          metrics: INITIAL_MANUAL_METRICS,
          telemetryHistoryByDate: {},
          activePreset: 'manual',
          syncing: false,
          syncError: null,
          calisthenicsStages: DEFAULT_PROGRESSION_STAGES,
        });
      },
    }),
    {
      name: 'zerocoach-telemetry-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.calisthenicsStages) {
          const completedMap = new Map(
            (state.calisthenicsStages || []).map((s) => [s.id, s.completed])
          );
          const skippedMap = new Map(
            (state.calisthenicsStages || []).map((s) => [s.id, s.skipped])
          );
          const customStages = (state.calisthenicsStages || []).filter((s) => s.isCustom);
          
          state.calisthenicsStages = [
            ...customStages,
            ...DEFAULT_PROGRESSION_STAGES.map((s) => ({
              ...s,
              completed: completedMap.get(s.id) ?? s.completed,
              skipped: skippedMap.get(s.id) ?? s.skipped,
            })),
          ];
        }
      },
    }
  )
);
