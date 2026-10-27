import { CoachingMode, UserProfile, TrainingGoal, AppLanguage } from '@/types/coach';
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
  language?: AppLanguage;
}): string {
  const { mode, userProfile, telemetry, activeStages, nutritionSummary, language } = params;

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
  * Logged Food Items Today: ${nutritionSummary.loggedMealsCount}`
    : `- DAILY NUTRITION:
  * Baseline Plan: ${userProfile.dailyCalorieTarget} kcal | ${userProfile.proteinGrams}g Protein | ${userProfile.carbsGrams}g Carbs | ${userProfile.fatGrams}g Fat`;

  const contextBlock = `
=== CURRENT ATHLETE & TELEMETRY CONTEXT ===
- COACHING MODE: ${mode.toUpperCase()}
- ATHLETE PROFILE:
  * Name: ${userProfile.name || 'Athlete'}
  * Skill Level: ${(userProfile.skillLevel || 'intermediate').toUpperCase()}
  * Biological Sex: ${(userProfile.sex || 'male').toUpperCase()}
  * Environment: ${userProfile.equipmentPreference === 'home' ? 'Home / Bodyweight' : userProfile.equipmentPreference === 'both' ? 'Hybrid' : 'Full Gym'}
  * Weight: ${userProfile.weightKg} kg | Height: ${userProfile.heightCm} cm
  * Primary Goals: ${userProfile.primaryGoals?.map((g) => g.replace(/_/g, ' ').toUpperCase()).join(', ') || userProfile.primaryGoal?.replace(/_/g, ' ').toUpperCase() || 'GENERAL FITNESS'}

- TARGET GOAL DIRECTIVES:
${goalDirectives.map((d) => `  * ${d}`).join('\n') || '  * Maintain balanced general fitness.'}

${telemetryBlock}

${workoutPlanBlock}

${nutritionBlock}

- ATHLETE MILESTONES:
  * Completed: ${completedStages.map((s) => `${s.skillName} Stg ${s.stageNumber}: ${s.stageTitle}`).join(', ') || 'None yet'}
  * Target: ${nextStage ? `${nextStage.skillName} Stg ${nextStage.stageNumber}: ${nextStage.stageTitle} (${nextStage.standard})` : 'All mastered'}
=============================================

CONVERSATIONAL & COACHING DIRECTIVES:
1. CASUAL CHAT & GREETINGS: Respond warmly and naturally as an athletic coach. Do not dump workouts or data for casual greetings.
2. TRAINING REQUESTS: Prescribe autoregulated workouts matching readiness (${telemetry.readinessScore}/100) and user goals.
3. NUTRITION REQUESTS: Recommend specific whole-food meals matching remaining caloric and protein budget.${
  language === 'th'
    ? '\n4. LANGUAGE MANDATE: ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาญี่ปุ่นหรือจีน'
    : ''
}`;

  return `${basePrompt}\n${contextBlock}`;
}

export function buildCompactSystemPrompt(params: {
  mode: CoachingMode;
  userProfile: UserProfile;
  telemetry: TelemetryMetrics;
  nutritionSummary?: NutritionPromptSummary;
  language?: AppLanguage;
}): string {
  const { mode, userProfile, telemetry, nutritionSummary, language } = params;
  const isStrict = mode === 'strict';
  const isThai = language === 'th';

  if (isThai) {
    const macroLine = nutritionSummary
      ? `เหลือ ${nutritionSummary.remainingCalories} kcal, โปรตีน ${nutritionSummary.remainingProtein}g`
      : `เป้าหมาย ${userProfile.dailyCalorieTarget} kcal, โปรตีน ${userProfile.proteinGrams}g`;

    const goal = userProfile.primaryGoals?.[0]?.replace(/_/g, ' ') || 'สร้างกล้ามเนื้อและสมรรถภาพ';
    const equip = userProfile.equipmentPreference === 'home' ? 'บอดี้เวท' : 'ยิม';
    const style = isStrict ? 'เข้มงวด วิทยาศาสตร์การกีฬา Progressive Overload' : 'เป็นกันเอง สุขภาพยั่งยืนและข้อต่อแข็งแรง';

    return `คุณคือ ZeroCoach โค้ชวิทยาศาสตร์การกีฬา AI (โหมด: ${style})
ข้อมูลนักกีฬา:
- ความพร้อม: ${telemetry.readinessScore}/100 | นอน: ${telemetry.sleepHours}ชม. (HRV: ${telemetry.heartRateVariability}ms)
- เป้าหมาย: ${goal} | อุปกรณ์: ${equip}
- โภชนาการ: ${macroLine}
แนวทาง:
1. ทักทาย/คุยทั่วไป: ตอบสั้น เป็นมิตร ไม่ต้องให้ตารางฝึก
2. ปรับการฝึกตามความพร้อม (${telemetry.readinessScore}/100): ต่ำกว่า 60 เน้นฟื้นฟู/ยืดเหยียด, 80 ขึ้นไปเน้น Progressive Overload
3. แนะนำอาหาร: คำนวณจากแคลอรี่และโปรตีนที่เหลือ
4. ตอบเป็นข้อๆ สั้นกระชับ ลงท้ายด้วยคำแนะนำถัดไป
5. ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาญี่ปุ่นหรือจีน`;
  }

  const nutritionLine = nutritionSummary
    ? `Remaining: ${nutritionSummary.remainingCalories} kcal, ${nutritionSummary.remainingProtein}g protein`
    : `Target: ${userProfile.dailyCalorieTarget} kcal, ${userProfile.proteinGrams}g protein`;

  const goal = userProfile.primaryGoals?.[0]?.replace(/_/g, ' ') || 'Strength & Hypertrophy';
  const equip = userProfile.equipmentPreference || 'gym';
  const style = isStrict ? 'Strict, biomechanical & progressive overload' : 'Supportive, longevity & consistency';

  return `You are ZeroCoach, an elite athletic AI coach (${style}).
ATHLETE:
- Readiness: ${telemetry.readinessScore}/100 | Sleep: ${telemetry.sleepHours}h | HRV: ${telemetry.heartRateVariability}ms
- Goal: ${goal} | Equip: ${equip}
- Nutrition: ${nutritionLine}
RULES:
1. Casual chat: Reply naturally & briefly without forcing workouts.
2. Training: Adapt to readiness (${telemetry.readinessScore}/100). If <60 recovery; if >=80 progressive overload.
3. Food: Give concrete options fitting remaining macros.
4. Keep responses punchy with bullet points and a clear next action.`;
}
