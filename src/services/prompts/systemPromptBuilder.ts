import { CoachingMode, UserProfile, TrainingGoal } from '@/types/coach';
import { TelemetryMetrics, CalisthenicsStage } from '@/types/telemetry';
import { STRICT_COACH_BASE_PROMPT } from './strictCoach';
import { COMFORTABLE_COACH_BASE_PROMPT } from './comfortableCoach';

const GOAL_PROGRAMMING_DIRECTIVES: Record<TrainingGoal, string> = {
  strength_hypertrophy:
    'STRENGTH & HYPERTROPHY: Prioritize progressive overload, 6–12 rep hypertrophy ranges, mechanical tension, and 1.8–2.2g/kg protein synthesis.',
  calisthenics_mastery:
    'CALISTHENICS MASTERY: Focus on relative bodyweight strength, scapular depression, isometric hold volume, and mastering L-Sit and Muscle-Up progression milestones.',
  fat_loss_recomp:
    'FAT LOSS & RECOMP: Prescribe a moderate caloric deficit (300–500 kcal), high protein retention to spare lean muscle, and high daily active movement.',
  cardio_endurance:
    'CARDIO & ENDURANCE: Prescribe Zone 2 aerobic base pacing, VO2 max stamina, resting heart rate lowering, and adequate carbohydrate fueling (avoid excessive caloric restriction).',
  daily_health_longevity:
    'DAILY HEALTH & LONGEVITY: Prescribe joint mobility routines, functional posture, stress reduction, and adapt training volume to Sleep Quality & HRV.',
};

export function buildSystemPrompt(params: {
  mode: CoachingMode;
  userProfile: UserProfile;
  telemetry: TelemetryMetrics;
  activeStages: CalisthenicsStage[];
}): string {
  const { mode, userProfile, telemetry, activeStages } = params;

  const basePrompt =
    mode === 'strict' ? STRICT_COACH_BASE_PROMPT : COMFORTABLE_COACH_BASE_PROMPT;

  const completedStages = activeStages.filter((s) => s.completed);
  const nextStage = activeStages.find((s) => !s.completed);

  const goalDirectives = (userProfile.primaryGoals || [])
    .map((g) => GOAL_PROGRAMMING_DIRECTIVES[g])
    .filter(Boolean);

  const contextBlock = `
=== CURRENT LIVE USER & TELEMETRY CONTEXT ===
- ACTIVE COACHING MODE: ${mode.toUpperCase()}
- USER PROFILE:
  * Name: ${userProfile.name}
  * Body Weight: ${userProfile.weightKg} kg | Height: ${userProfile.heightCm} cm
  * Calorie Baseline: ${userProfile.dailyCalorieTarget} kcal
  * Macro Split: ${userProfile.proteinGrams}g Protein | ${userProfile.carbsGrams}g Carbs | ${userProfile.fatGrams}g Fat
  * Primary Goals: ${userProfile.primaryGoals?.map((g) => g.replace(/_/g, ' ').toUpperCase()).join(', ') || userProfile.primaryGoal?.replace(/_/g, ' ').toUpperCase() || 'GENERAL FITNESS'}

- TARGET GOAL DIRECTIVES:
${goalDirectives.map((d) => `  * ${d}`).join('\n') || '  * Maintain balanced general fitness.'}

- LIVE BIOMETRIC TELEMETRY (Source: ${telemetry.source === 'manual' ? 'Manual User Log (No App Synced)' : `Device Bridge ${telemetry.source.replace(/_/g, ' ').toUpperCase()}`}):
  * Daily Readiness Score: ${telemetry.readinessScore}/100
  * Sleep Duration: ${telemetry.sleepHours} hrs (Deep Sleep: ${telemetry.deepSleepHours} hrs, Score: ${telemetry.sleepQualityScore}/100)
  * Resting Heart Rate: ${telemetry.restingHeartRate} bpm
  * Heart Rate Variability (HRV): ${telemetry.heartRateVariability} ms
  * Daily Step Count: ${telemetry.steps.toLocaleString()}
  * Active Energy Burned: ${telemetry.activeCalories} kcal

- CALISTHENICS PROGRESSION TRACKER:
  * Completed Milestones: ${completedStages.map((s) => s.stageTitle).join(', ') || 'None yet'}
  * Current Target Milestone: ${nextStage ? `${nextStage.stageTitle} (${nextStage.standard})` : 'All mastered'}
=============================================

Incorporate this physiological state into your response immediately. If the user asks for advice or a workout adjustment, tailor your answer precisely to their current readiness score, target goal directives, and active metrics.`;

  return `${basePrompt}\n${contextBlock}`;
}
