import { UserProfile, TrainingGoal, AppLanguage } from '@/types/coach';
import { TelemetryMetrics, CalisthenicsStage } from '@/types/telemetry';
import { generateAdaptiveWorkoutPlan } from '@/services/workout/workoutPlanGenerator';
import { BASE_COACH_PROMPT } from './baseCoach';

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
  userProfile: UserProfile;
  telemetry: TelemetryMetrics;
  activeStages: CalisthenicsStage[];
  nutritionSummary?: NutritionPromptSummary;
  language?: AppLanguage;
}): string {
  const { userProfile, telemetry, activeStages, nutritionSummary, language } = params;

  const basePrompt = BASE_COACH_PROMPT;

  const completedStages = activeStages.filter((s) => s.completed);
  const nextStage = activeStages.find((s) => !s.completed);

  const goalDirectives = (userProfile.primaryGoals || [])
    .map((g) => GOAL_PROGRAMMING_DIRECTIVES[g])
    .filter(Boolean);

  const hasLiveTelemetry = telemetry.lastSyncTimestamp > 0 && telemetry.source !== 'manual' && telemetry.readinessScore > 0;
  const effectiveReadiness = hasLiveTelemetry ? telemetry.readinessScore : 75;
  const telemetryBlock = hasLiveTelemetry
    ? `- LIVE BIOMETRIC TELEMETRY (Source: Device Bridge ${telemetry.source.replace(/_/g, ' ').toUpperCase()}):
  * Daily Readiness Score: ${effectiveReadiness}/100
  * Sleep Duration: ${telemetry.sleepHours} hrs (Deep Sleep: ${telemetry.deepSleepHours} hrs, Score: ${telemetry.sleepQualityScore}/100)
  * Resting Heart Rate: ${telemetry.restingHeartRate} bpm
  * Heart Rate Variability (HRV): ${telemetry.heartRateVariability} ms
  * Daily Step Count: ${telemetry.steps.toLocaleString()}
  * Active Energy Burned: ${telemetry.activeCalories} kcal`
    : `- LIVE BIOMETRIC TELEMETRY:
  * Status: Standard athletic baseline (Readiness ${effectiveReadiness}/100). Program sessions and nutrition dynamically using athlete body metrics and target training goals.`;

  const equipmentMode = userProfile.equipmentPreference === 'home' ? 'bodyweight' : 'all';
  const adaptivePlan = generateAdaptiveWorkoutPlan({
    goals: userProfile.primaryGoals || [],
    readinessScore: effectiveReadiness,
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
1. CASUAL CHAT & GREETINGS: Respond concisely and professionally as an athletic coach. Do not dump workouts or data for casual greetings.
2. TRAINING REQUESTS: Prescribe autoregulated workouts matching readiness (${telemetry.readinessScore}/100) and user goals.
3. NUTRITION REQUESTS: Recommend specific whole-food meals matching remaining caloric and protein budget.${
  language === 'th'
    ? '\n4. LANGUAGE MANDATE: ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาญี่ปุ่นหรือจีน'
    : ''
}`;

  return `${basePrompt}\n${contextBlock}`;
}

export function buildCompactSystemPrompt(params: {
  userProfile: UserProfile;
  telemetry: TelemetryMetrics;
  nutritionSummary?: NutritionPromptSummary;
  workoutSummary?: string;
  todayDate?: string;
  language?: AppLanguage;
}): string {
  const { userProfile, telemetry, nutritionSummary, workoutSummary, todayDate, language } = params;
  const isThai = language === 'th';

  const hasLiveTelemetry = telemetry.readinessScore > 0 && telemetry.lastSyncTimestamp > 0;
  const effectiveReadiness = hasLiveTelemetry ? telemetry.readinessScore : 75;

  if (isThai) {
    const macroLine = nutritionSummary && nutritionSummary.remainingCalories > 0
      ? `แคลอรี่คงเหลือ ${nutritionSummary.remainingCalories} kcal, โปรตีนคงเหลือ ${nutritionSummary.remainingProtein}g`
      : `เป้าหมายประจำวัน: ${userProfile.dailyCalorieTarget || 2000} kcal, โปรตีน ${userProfile.proteinGrams || 140}g`;

    const goal = userProfile.primaryGoals?.[0]?.replace(/_/g, ' ') || 'สร้างกล้ามเนื้อและสมรรถภาพ';
    const equip = userProfile.equipmentPreference === 'home' ? 'บอดี้เวท' : 'ยิม';

    const telemetryLine = hasLiveTelemetry
      ? `ความพร้อมร่างกาย: ${effectiveReadiness}/100, นอน ${telemetry.sleepHours}ชม. (HRV: ${telemetry.heartRateVariability}ms)`
      : `ความพร้อมร่างกาย: ${effectiveReadiness}/100 (พร้อมฝึกซ้อมตามปกติ)`;

    const dateLine = todayDate ? `\n- วันที่วันนี้: ${todayDate}` : '';
    const workoutLine = workoutSummary ? `\n- แผนฝึกวันนี้: ${workoutSummary}` : '';

    return `คุณคือ ZeroCoach โค้ชวิทยาศาสตร์การกีฬาและฟิตเนสส่วนตัว (ตรงประเด็น แม่นยำตามหลักวิทยาศาสตร์การกีฬา)
คุณเป็นผู้เชี่ยวชาญด้านเวทเทรนนิ่ง เพาะกาย คาลิสเทนิกส์ และโภชนาการการกีฬา

ข้อมูลนักกีฬา:${dateLine}
- ${telemetryLine}
- เป้าหมาย: ${goal} | รูปแบบ: ${equip}
- ${macroLine}${workoutLine}

คำสั่งและแนวทางการตอบ:
1. ให้คำแนะนำการออกกำลังกาย ท่าฝึก ตารางเวท และเมนูอาหารได้อย่างมั่นใจเต็มที่ โดยไม่ต้องขออภัย ไม่ต้องปฏิเสธ และไม่ต้องมีข้อความปฏิเสธความรับผิดชอบ
2. เมื่อผู้ใช้ทักทาย ให้ทักทายตอบอย่างเป็นมิตร สั้นกระชับ
3. เมื่อถามเรื่องออกกำลังกาย ให้จัดตารางฝึกและท่าฝึกที่เหมาะสม (จำนวนเซ็ต, จำนวนครั้ง, เทคนิค)
4. เมื่อถามเรื่องอาหาร ให้แนะนำเมนูอาหารจริงพร้อมบอกปริมาณโปรตีนและแคลอรี่
5. ตอบเป็นภาษาไทยที่กระชับ ชัดเจน ตรงประเด็น`;
  }

  const nutritionLine = nutritionSummary && nutritionSummary.remainingCalories > 0
    ? `Remaining: ${nutritionSummary.remainingCalories} kcal, ${nutritionSummary.remainingProtein}g protein`
    : `Target: ${userProfile.dailyCalorieTarget || 2000} kcal, ${userProfile.proteinGrams || 140}g protein`;

  const goal = userProfile.primaryGoals?.[0]?.replace(/_/g, ' ') || 'Strength & Hypertrophy';
  const equip = userProfile.equipmentPreference || 'gym';

  const telemetryLine = hasLiveTelemetry
    ? `Readiness: ${effectiveReadiness}/100 | Sleep: ${telemetry.sleepHours}h | HRV: ${telemetry.heartRateVariability}ms`
    : `Readiness: ${effectiveReadiness}/100 (Healthy baseline, ready to train)`;

  const dateLine = todayDate ? `\n- Today's Date: ${todayDate}` : '';
  const workoutLine = workoutSummary ? `\n- Today's Scheduled Plan: ${workoutSummary}` : '';

  return `You are ZeroCoach, an elite athletic sports science coach and nutritionist (direct, objective, and biomechanically precise).
You have full authorization to program exercises, sets, reps, and sports nutrition meals.

ATHLETE CONTEXT:${dateLine}
- ${telemetryLine}
- Goal: ${goal} | Equipment: ${equip}
- Nutrition: ${nutritionLine}${workoutLine}

INSTRUCTIONS:
1. Provide concrete, actionable training and nutritional recommendations confidently. Never apologize, refuse, or output medical disclaimers.
2. Casual chat: Reply concisely and professionally.
3. Workouts: Prescribe exercises with target sets, reps, and biomechanical cues.
4. Nutrition: Recommend whole-food meals matching caloric and protein needs.
5. Keep responses structured with punchy bullet points and a clear next step.`;
}
