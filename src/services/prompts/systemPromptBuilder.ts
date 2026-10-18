import { CoachingMode, UserProfile, TrainingGoal } from '@/types/coach';
import { TelemetryMetrics, CalisthenicsStage } from '@/types/telemetry';
import { generateAdaptiveWorkoutPlan } from '@/services/workout/workoutPlanGenerator';
import { STRICT_COACH_BASE_PROMPT } from './strictCoach';
import { COMFORTABLE_COACH_BASE_PROMPT } from './comfortableCoach';

const GOAL_PROGRAMMING_DIRECTIVES: Record<TrainingGoal, string> = {
  strength_hypertrophy:
    'STRENGTH & HYPERTROPHY: Prioritize progressive overload, 6–12 rep hypertrophy ranges, mechanical tension, and 1.8–2.2g/kg protein synthesis.',
  calisthenics_mastery:
    'CALISTHENICS MASTERY: Focus on relative bodyweight strength, scapular depression, isometric hold volume, and bodyweight skill progression milestones.',
  fat_loss_recomp:
    'FAT LOSS & RECOMP: Prescribe a moderate caloric deficit (300–500 kcal), high protein retention to spare lean muscle, and high daily active movement.',
  cardio_endurance:
    'CARDIO & ENDURANCE: Prescribe Zone 2 aerobic base pacing, VO2 max stamina, resting heart rate lowering, and adequate carbohydrate fueling (avoid excessive caloric restriction).',
  daily_health_longevity:
    'DAILY HEALTH & LONGEVITY: Prescribe joint mobility routines, functional posture, stress reduction, and adapt training volume to Sleep Quality & HRV.',
};

export interface NutritionPromptSummary {
  totalCalories: number;
  targetCalories: number;
  totalProtein: number;
  targetProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  remainingCalories: number;
  remainingProtein: number;
  loggedMealsCount: number;
}

export function buildSystemPrompt(params: {
  mode: CoachingMode;
  userProfile: UserProfile;
  telemetry: TelemetryMetrics;
  activeStages: CalisthenicsStage[];
  nutritionSummary?: NutritionPromptSummary;
}): string {
  const { mode, userProfile, telemetry, activeStages, nutritionSummary } = params;

  const basePrompt =
    mode === 'strict' ? STRICT_COACH_BASE_PROMPT : COMFORTABLE_COACH_BASE_PROMPT;

  const completedStages = activeStages.filter((s) => s.completed);
  const nextStage = activeStages.find((s) => !s.completed);

  const goalDirectives = (userProfile.primaryGoals || [])
    .map((g) => GOAL_PROGRAMMING_DIRECTIVES[g])
    .filter(Boolean);

  const hasLiveTelemetry = telemetry.lastSyncTimestamp > 0 && telemetry.source !== 'manual';
  const telemetryBlock = hasLiveTelemetry
    ? `- LIVE BIOMETRIC TELEMETRY (Source: Device Bridge ${telemetry.source.replace(/_/g, ' ').toUpperCase()}):
  * Daily Readiness Score: ${telemetry.readinessScore}/100
  * Sleep Duration: ${telemetry.sleepHours} hrs (Deep Sleep: ${telemetry.deepSleepHours} hrs, Score: ${telemetry.sleepQualityScore}/100)
  * Resting Heart Rate: ${telemetry.restingHeartRate} bpm
  * Heart Rate Variability (HRV): ${telemetry.heartRateVariability} ms
  * Daily Step Count: ${telemetry.steps.toLocaleString()}
  * Active Energy Burned: ${telemetry.activeCalories} kcal`
    : `- LIVE BIOMETRIC TELEMETRY:
  * Status: No wearable synced. Program sessions and nutrition dynamically using athlete body metrics and target training goals.`;

  const equipmentMode = userProfile.equipmentPreference === 'home' ? 'bodyweight' : 'all';
  const adaptivePlan = generateAdaptiveWorkoutPlan({
    goals: userProfile.primaryGoals || [],
    mode,
    readinessScore: telemetry.readinessScore,
    weightKg: userProfile.weightKg,
    heightCm: userProfile.heightCm,
    activeStages,
    activeCalories: telemetry.activeCalories,
    equipmentMode,
    sex: userProfile.sex,
    skillLevel: userProfile.skillLevel || 'intermediate',
  });

  const workoutPlanBlock = `- DATA-GENERATED EXERCISE PLAN:
  * Focus: ${adaptivePlan.title} (${adaptivePlan.tierLabel})
  * Estimated Session Duration: ${adaptivePlan.estimatedDurationMin} min (~${adaptivePlan.estimatedCaloriesBurn || 250} kcal)
  * Target Skill Milestone: ${adaptivePlan.targetSkillMilestone || 'None'}
  * Autoregulation Directive: ${adaptivePlan.readinessMultiplierDesc}
  * Coach Split Recommendation: ${adaptivePlan.coachRecommendation?.splitTitle || adaptivePlan.title}
  * Recommendation Rationale: ${adaptivePlan.coachRecommendation?.reasoning || 'Autoregulated for optimal athletic progression.'}
  * Prescribed Exercises:
${adaptivePlan.exercises.map((e) => `    - [${e.category.toUpperCase()}] ${e.name} (${e.targetSets} sets × ${e.targetReps}, rest ${e.restPeriodSeconds}s, ${e.intensityNote}) | Cue: ${e.coachingCue}`).join('\n')}
  * WORKOUT SUGGESTION DIRECTIVE:
    When the athlete asks to "suggest workout plan" or asks what to train today:
    1. Immediately evaluate their goal (${userProfile.primaryGoals?.[0]?.replace(/_/g, ' ').toUpperCase() || 'STRENGTH'}), skill level (${(userProfile.skillLevel || 'intermediate').toUpperCase()}), and current readiness score (${telemetry.readinessScore}/100).
    2. Suggest the recommended split "${adaptivePlan.title}". State clearly why it is optimal for their recovery state and skill level today.
    3. List 3 to 4 core exercises with target sets, reps, and biomechanical cues.`;

  const nutritionBlock = nutritionSummary
    ? `- DAILY NUTRITION LOG & MACRO STATUS:
  * Calories: ${nutritionSummary.totalCalories} / ${nutritionSummary.targetCalories} kcal (${nutritionSummary.remainingCalories} kcal remaining)
  * Protein: ${nutritionSummary.totalProtein}g / ${nutritionSummary.targetProtein}g (${nutritionSummary.remainingProtein}g remaining)
  * Carbs: ${nutritionSummary.totalCarbs}g | Fat: ${nutritionSummary.totalFat}g | Fiber: ${nutritionSummary.totalFiber}g
  * Logged Food Items Today: ${nutritionSummary.loggedMealsCount}
  * FOOD SUGGESTION DIRECTIVE:
    When the athlete asks to "suggest food" or for meal ideas:
    1. Immediately calculate their remaining calories (${nutritionSummary.remainingCalories} kcal) and remaining protein (${nutritionSummary.remainingProtein}g).
    2. Recommend 2 to 3 practical, real whole-food meal or snack options (e.g. wild salmon with sweet potatoes, Greek yogurt with berries and honey, grilled chicken breast with quinoa and avocado).
    3. Specify exact portion sizes in grams/cups and macro estimates (Protein, Carbs, Fat, kcal) for each suggestion.
    4. Match tone: In STRICT mode, emphasize nutrient timing, leucine threshold for protein synthesis, and low-inflammation recovery. In COMFORTABLE mode, make it delicious, wholesome, and easy to prepare.`
    : `- DAILY NUTRITION:
  * Baseline Plan: ${userProfile.dailyCalorieTarget} kcal | ${userProfile.proteinGrams}g Protein | ${userProfile.carbsGrams}g Carbs | ${userProfile.fatGrams}g Fat
  * FOOD SUGGESTION DIRECTIVE:
    When the athlete asks to "suggest food" or for meal ideas, suggest 2-3 wholesome nutrient-dense whole-food options aligned with their baseline targets (${userProfile.dailyCalorieTarget} kcal, ${userProfile.proteinGrams}g protein), with exact portions and macro estimates.`;

  const contextBlock = `
=== CURRENT LIVE USER & TELEMETRY CONTEXT ===
- ACTIVE COACHING MODE: ${mode.toUpperCase()}
- USER PROFILE:
  * Name: ${userProfile.name || 'Athlete'}
  * Athlete Skill Level: ${(userProfile.skillLevel || 'intermediate').toUpperCase()}
  * Biological Sex: ${(userProfile.sex || 'male').toUpperCase()} (${userProfile.sex === 'female' ? 'Higher relative volume tolerance, faster intra-set recovery' : 'Higher relative mechanical tension, longer recovery intervals'})
  * Training Environment: ${userProfile.equipmentPreference === 'home' ? 'Home / Bodyweight (Calisthenics)' : userProfile.equipmentPreference === 'both' ? 'Hybrid (Gym & Bodyweight)' : 'Full Gym (Barbells, DBs, Cables)'}
  * Body Weight: ${userProfile.weightKg} kg | Height: ${userProfile.heightCm} cm
  * Calorie Baseline: ${userProfile.dailyCalorieTarget} kcal
  * Macro Split: ${userProfile.proteinGrams}g Protein | ${userProfile.carbsGrams}g Carbs | ${userProfile.fatGrams}g Fat
  * Primary Goals: ${userProfile.primaryGoals?.map((g) => g.replace(/_/g, ' ').toUpperCase()).join(', ') || userProfile.primaryGoal?.replace(/_/g, ' ').toUpperCase() || 'GENERAL FITNESS'}

- TARGET GOAL DIRECTIVES:
${goalDirectives.map((d) => `  * ${d}`).join('\n') || '  * Maintain balanced general fitness.'}

${telemetryBlock}

${workoutPlanBlock}

${nutritionBlock}

- ATHLETE PROGRESSION & BENCHMARKS TRACKER:
  * Completed Milestones: ${completedStages.map((s) => `${s.skillName} Stg ${s.stageNumber}: ${s.stageTitle}`).join(', ') || 'None yet'}
  * Current Target Milestone: ${nextStage ? `${nextStage.skillName} Stg ${nextStage.stageNumber}: ${nextStage.stageTitle} (${nextStage.standard})` : 'All mastered'}
=============================================

Incorporate this physiological state into your response immediately. If the user asks for advice or a workout adjustment, tailor your answer precisely to their current readiness score, target goal directives, and active metrics.`;

  return `${basePrompt}\n${contextBlock}`;
}

export function buildCompactSystemPrompt(params: {
  mode: CoachingMode;
  userProfile: UserProfile;
  telemetry: TelemetryMetrics;
  nutritionSummary?: NutritionPromptSummary;
}): string {
  const { mode, userProfile, telemetry, nutritionSummary } = params;
  const isStrict = mode === 'strict';

  const nutritionLine = nutritionSummary
    ? `Nutrition: ${nutritionSummary.remainingCalories} kcal, ${nutritionSummary.remainingProtein}g protein remaining.`
    : `Nutrition target: ${userProfile.dailyCalorieTarget} kcal, ${userProfile.proteinGrams}g protein.`;

  return `You are ZeroCoach in ${mode.toUpperCase()} ATHLETE MODE—an elite sports scientist and strength coach.
${isStrict ? 'Your style is direct, focused on biomechanical precision, kinetic chain mechanics, and progressive overload.' : 'Your style is encouraging, focused on consistency, joint health, and sustainable longevity.'}

ATHLETE METRICS:
- Readiness: ${telemetry.readinessScore}/100 | Sleep: ${telemetry.sleepHours}h | HRV: ${telemetry.heartRateVariability}ms
- Goal: ${userProfile.primaryGoals?.[0]?.replace(/_/g, ' ') || 'Strength & Hypertrophy'} | Level: ${(userProfile.skillLevel || 'intermediate').toUpperCase()}
- Equipment: ${userProfile.equipmentPreference || 'gym'}
- ${nutritionLine}

COACHING DIRECTIVES:
1. Adapt directly to readiness (${telemetry.readinessScore}/100): if < 60 prioritize active recovery; if >= 80 demand progressive overload.
2. Provide 2-3 specific, actionable recommendations with target sets, reps, or cues.
3. Keep response concise, structured with bullet points. End with a clear next action.`;
}
