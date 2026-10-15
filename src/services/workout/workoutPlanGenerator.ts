import { CoachingMode, TrainingGoal } from '@/types/coach';
import { CalisthenicsStage } from '@/types/telemetry';
import { GeneratedWorkoutPlan, ExerciseItem, WorkoutIntensityTier } from '@/types/workout';
import { exerciseRepository } from './exerciseRepository';
import { RepDBExercise } from '@/types/exercise';

export interface WorkoutPlanGenerationParams {
  goals: TrainingGoal[];
  mode: CoachingMode;
  readinessScore: number;
  weightKg: number;
  heightCm: number;
  activeStages: CalisthenicsStage[];
  activeCalories?: number;
  equipmentMode?: 'all' | 'bodyweight';
}

/**
 * Maps a RepDB exercise item to the UI ExerciseItem model
 */
function createExerciseItemFromRepDB(
  repDb: RepDBExercise,
  category: ExerciseItem['category'],
  targetSets: number,
  targetReps: string,
  restPeriodSeconds: number,
  intensityNote: string,
  customCue?: string
): ExerciseItem {
  const defaultCue = repDb.tips_en && repDb.tips_en.length > 0
    ? repDb.tips_en[0]
    : 'Maintain crisp cadence and full range of motion.';

  return {
    id: repDb.id,
    name: repDb.name_en,
    category,
    targetSets,
    targetReps,
    restPeriodSeconds,
    intensityNote,
    coachingCue: customCue || defaultCue,
    equipment: repDb.equipment || (repDb.is_bodyweight ? 'bodyweight' : 'equipment'),
    bodyPart: repDb.body_part,
    primaryMuscles: repDb.primary_muscles,
    mechanic: repDb.mechanic,
    difficulty: repDb.difficulty,
    isBodyweight: repDb.is_bodyweight,
    met: repDb.met || 5.0,
  };
}

/**
 * Generates an adaptive, evidence-based exercise plan dynamically tailored to:
 * 1. RepDB Open Exercise Dataset (643 exercises with METs, mechanics, and cues)
 * 2. Equipment Mode (Full Gym vs Bodyweight Only)
 * 3. Selected Training Goals (Strength, Calisthenics, Fat Loss, Cardio, Longevity)
 * 4. Wearable Telemetry & Recovery Readiness (Autoregulated Sets, Reps, RPE)
 * 5. Coaching Philosophy (Strict sports science vs Comfortable health)
 */
export function generateAdaptiveWorkoutPlan(
  params: WorkoutPlanGenerationParams
): GeneratedWorkoutPlan {
  const {
    goals = [],
    mode = 'strict',
    readinessScore = 0,
    weightKg = 0,
    activeStages = [],
    equipmentMode = 'all',
  } = params;

  const isStrict = mode === 'strict';
  const isGym = equipmentMode === 'all';

  // 1. Determine Autoregulated Intensity Tier from Readiness
  let tier: WorkoutIntensityTier = 'baseline';
  let tierLabel = 'METABOLIC BASELINE';
  let volumeMultiplier = 1.0;
  let defaultRpe = isStrict ? 'RPE 8' : 'RPE 7';
  let readinessMultiplierDesc =
    'Standard progressive volume. Adjust pace based on internal perceived exertion.';

  if (readinessScore >= 80) {
    tier = 'peak';
    tierLabel = 'PEAK OVERLOAD PROTOCOL';
    volumeMultiplier = 1.25;
    defaultRpe = isStrict ? 'RPE 8.5–9' : 'RPE 8';
    readinessMultiplierDesc =
      `Optimal recovery (${readinessScore}/100). High neural drive. Target progressive overload and skill PRs.`;
  } else if (readinessScore >= 60) {
    tier = 'optimal';
    tierLabel = 'STANDARD PROGRESSION';
    volumeMultiplier = 1.0;
    defaultRpe = isStrict ? 'RPE 7.5–8' : 'RPE 7';
    readinessMultiplierDesc =
      `Balanced recovery (${readinessScore}/100). Maintain crisp cadence, standard sets, and full range of motion.`;
  } else if (readinessScore > 0) {
    tier = 'deload';
    tierLabel = 'AUTOREGULATED DELOAD';
    volumeMultiplier = 0.65;
    defaultRpe = isStrict ? 'RPE 5–6' : 'RPE 5';
    readinessMultiplierDesc =
      `Depressed recovery (${readinessScore}/100). Volume reduced by 35% to protect joints and facilitate CNS repair.`;
  }

  // 2. Resolve Active Calisthenics Target Milestone
  const nextStage = activeStages.find((s) => !s.completed);
  const targetSkillMilestone = nextStage
    ? `${nextStage.skillName} Stage ${nextStage.stageNumber}: ${nextStage.stageTitle}`
    : isGym
      ? 'Barbell Strength Benchmark'
      : 'Calisthenics Bodyweight Mastery';

  const exercises: ExerciseItem[] = [];

  // ==========================================
  // BLOCK 1: DYNAMIC WARM-UP & MOBILITY (RepDB)
  // ==========================================
  const catCow = exerciseRepository.getById('cat-cow');
  if (catCow) {
    exercises.push(
      createExerciseItemFromRepDB(
        catCow,
        'warmup',
        2,
        '10–12 fluid reps',
        30,
        'Low • Spinal Articulation',
        isStrict
          ? 'Synchronize breath: inhale into thoracic extension, exhale into posterior pelvic tuck.'
          : catCow.tips_en?.[0]
      )
    );
  }

  const prepId = isGym ? 'glute-bridge' : 'downward-dog-to-plank';
  const prepEx = exerciseRepository.getById(prepId) || exerciseRepository.getById('glute-bridge');
  if (prepEx) {
    exercises.push(
      createExerciseItemFromRepDB(
        prepEx,
        'warmup',
        2,
        isGym ? '12 paused contractions' : '8 slow transitions',
        30,
        'Moderate • Pelvic & Scapular Activation',
        prepEx.tips_en?.[0]
      )
    );
  }

  // ==========================================
  // BLOCK 2: TARGET SKILL / PRIORITY COMPOUND
  // ==========================================
  const skillSets = Math.max(2, Math.round((tier === 'peak' ? 4 : tier === 'deload' ? 2 : 3) * volumeMultiplier));
  if (nextStage) {
    // Athlete is tracking calisthenics milestones
    exercises.push({
      id: `skill-${nextStage.id}`,
      name: `${nextStage.skillName}: ${nextStage.stageTitle}`,
      category: 'skill',
      targetSets: skillSets,
      targetReps: nextStage.standard.includes('sets of')
        ? nextStage.standard.replace(/\d+\s*sets\s*of\s*/i, '').trim()
        : '3–5 strict reps',
      restPeriodSeconds: tier === 'peak' ? 120 : tier === 'deload' ? 60 : 90,
      intensityNote: `${defaultRpe} • Priority Skill`,
      coachingCue: isStrict
        ? `Strict Standard: ${nextStage.standard}. Focus on maximum tendon tension and clean lockouts.`
        : `Work within your comfortable threshold. Stop 1-2 reps before mechanical breakdown.`,
      equipment: 'calisthenics',
      bodyPart: 'full_body',
      primaryMuscles: ['rectus_abdominis', 'latissimus_dorsi'],
      mechanic: 'compound',
      difficulty: 'intermediate',
      isBodyweight: true,
      met: 6.0,
    });
  } else if (isGym) {
    // Gym Mode Priority Lift (Barbell Bench Press)
    const bench = exerciseRepository.getById('bench-press');
    if (bench) {
      exercises.push(
        createExerciseItemFromRepDB(
          bench,
          'skill',
          skillSets,
          tier === 'peak' ? '4–6 heavy reps' : '6–8 solid reps',
          120,
          `${defaultRpe} • Primary Compound Lift`,
          bench.tips_en?.[0]
        )
      );
    }
  }

  // ==========================================
  // BLOCK 3: GOAL-SPECIFIC MAIN WORKOUT (RepDB)
  // ==========================================
  const hasStrength = goals.includes('strength_hypertrophy') || goals.length === 0;
  const hasFatLoss = goals.includes('fat_loss_recomp');
  const hasCardio = goals.includes('cardio_endurance');
  const hasHealth = goals.includes('daily_health_longevity');

  const strengthSets = Math.max(2, Math.round((tier === 'peak' ? 4 : tier === 'deload' ? 2 : 3) * volumeMultiplier));

  if (hasStrength) {
    if (isGym) {
      // 1. Compound Pull: Bent-Over Barbell Row or Pull-up
      const row = exerciseRepository.getById('barbell-row') || exerciseRepository.getById('pull-up');
      if (row) {
        exercises.push(
          createExerciseItemFromRepDB(
            row,
            'strength',
            strengthSets,
            isStrict ? '8–10 reps (2-0-1-0 tempo)' : '8–10 controlled reps',
            90,
            `${defaultRpe} • Horizontal Pull`,
            row.tips_en?.[0]
          )
        );
      }

      // 2. Compound Lower: Barbell Bulgarian Split Squat or Deadlift
      const lowerId = tier === 'peak' ? 'deadlift' : 'barbell-bulgarian-split-squat';
      const lower = exerciseRepository.getById(lowerId) || exerciseRepository.getById('deadlift');
      if (lower) {
        exercises.push(
          createExerciseItemFromRepDB(
            lower,
            'strength',
            Math.max(2, strengthSets - (tier === 'deload' ? 1 : 0)),
            tier === 'peak' ? '5 reps / side' : '8–10 reps',
            90,
            `${defaultRpe} • Lower Chain Hypertrophy`,
            lower.tips_en?.[0]
          )
        );
      }

      // 3. Accessory / Overhead: Arnold Press
      const arnold = exerciseRepository.getById('arnold-press');
      if (arnold) {
        exercises.push(
          createExerciseItemFromRepDB(
            arnold,
            'strength',
            Math.max(2, strengthSets - 1),
            '10–12 smooth reps',
            60,
            `${defaultRpe} • Deltoid Compound`,
            arnold.tips_en?.[0]
          )
        );
      }
    } else {
      // Bodyweight / Calisthenics Strength Movements
      // 1. Push: Archer Push Ups or Close Grip Push Ups
      const pushId = tier === 'peak' ? 'archer-push-ups' : 'close-grip-push-ups';
      const push = exerciseRepository.getById(pushId) || exerciseRepository.getById('close-grip-push-ups');
      if (push) {
        exercises.push(
          createExerciseItemFromRepDB(
            push,
            'strength',
            strengthSets,
            isStrict ? '8–10 reps (3-0-1-0 tempo)' : '10–12 smooth reps',
            75,
            `${defaultRpe} • Bodyweight Push Overload`,
            push.tips_en?.[0]
          )
        );
      }

      // 2. Pull: Pull-Up
      const pull = exerciseRepository.getById('pull-up');
      if (pull) {
        exercises.push(
          createExerciseItemFromRepDB(
            pull,
            'strength',
            strengthSets,
            '6–8 dead-hang reps',
            90,
            `${defaultRpe} • Vertical Pull`,
            pull.tips_en?.[0]
          )
        );
      }

      // 3. Lower: Cossack Squat or Bodyweight Squat
      const squat = exerciseRepository.getById('cossack-squat') || exerciseRepository.getById('bodyweight-squat');
      if (squat) {
        exercises.push(
          createExerciseItemFromRepDB(
            squat,
            'strength',
            Math.max(2, strengthSets - 1),
            '8 reps per side',
            60,
            `${defaultRpe} • Frontal Plane Lower`,
            squat.tips_en?.[0]
          )
        );
      }
    }
  }

  // Metabolic conditioning / fat loss
  if (hasFatLoss) {
    const burpee = exerciseRepository.getById('burpees');
    if (burpee) {
      exercises.push(
        createExerciseItemFromRepDB(
          burpee,
          'metabolic',
          tier === 'deload' ? 2 : 3,
          '12–15 explosive reps',
          45,
          'High Density • Elevated Metabolic Output',
          burpee.tips_en?.[0]
        )
      );
    }

    const cardioId = isGym ? 'box-jump' : 'plank';
    const cardioEx = exerciseRepository.getById(cardioId);
    if (cardioEx) {
      exercises.push(
        createExerciseItemFromRepDB(
          cardioEx,
          'metabolic',
          3,
          cardioId === 'plank' ? '45s isometric hold' : '10 snappy reps',
          45,
          'Core & Power Endurance',
          cardioEx.tips_en?.[0]
        )
      );
    }
  }

  // Cardio / Aerobic base
  if (hasCardio) {
    const cardioTool = isGym ? 'air-bike' : 'burpees';
    const cardioRepDb = exerciseRepository.getById(cardioTool) || exerciseRepository.getById('jump-rope');
    if (cardioRepDb) {
      exercises.push(
        createExerciseItemFromRepDB(
          cardioRepDb,
          'metabolic',
          1,
          tier === 'deload' ? '12 min steady tempo' : '20 min Zone-2 pace',
          60,
          `Zone 2 • MET ${cardioRepDb.met} Aerobic Engine`,
          cardioRepDb.tips_en?.[0]
        )
      );
    }
  }

  // Daily health / Longevity / Mobility
  if (hasHealth) {
    const birdDog = exerciseRepository.getById('bird-dog');
    if (birdDog) {
      exercises.push(
        createExerciseItemFromRepDB(
          birdDog,
          'strength',
          2,
          '10 reps per side (2s pause)',
          45,
          'Restorative • Spine & Glute Stability',
          birdDog.tips_en?.[0]
        )
      );
    }
  }

  // ==========================================
  // BLOCK 4: COOLDOWN & DOWN-REGULATION (RepDB)
  // ==========================================
  const childPose = exerciseRepository.getById('childs-pose') || exerciseRepository.getById('cobra-stretch');
  if (childPose) {
    exercises.push(
      createExerciseItemFromRepDB(
        childPose,
        'cooldown',
        2,
        '45s deep stretch + diaphragmatic breathing',
        30,
        'Parasympathetic Reset',
        childPose.tips_en?.[0]
      )
    );
  }

  // Calculate estimated duration & active calorie burn from exercise MET values
  const totalSets = exercises.reduce((acc, ex) => acc + ex.targetSets, 0);
  const totalRestSeconds = exercises.reduce((acc, ex) => acc + ex.targetSets * ex.restPeriodSeconds, 0);
  const workSeconds = totalSets * 45; // average 45s work per set
  const estimatedDurationMin = Math.round((totalRestSeconds + workSeconds) / 60);

  // MET-based calorie formula: Calories = MET * weightKg * (hours)
  const athleteWeight = weightKg > 0 ? weightKg : 75; // default 75kg if not entered
  let calculatedCalories = 0;
  for (const ex of exercises) {
    const met = ex.met || 5.0;
    const exerciseMinutes = (ex.targetSets * (45 + ex.restPeriodSeconds)) / 60;
    calculatedCalories += met * athleteWeight * (exerciseMinutes / 60);
  }
  const estimatedCaloriesBurn = Math.max(120, Math.round(calculatedCalories / 5) * 5);

  // Focus Title
  const goalTitles = goals.map((g) => {
    switch (g) {
      case 'strength_hypertrophy':
        return isGym ? 'Full Gym Strength' : 'Bodyweight Hypertrophy';
      case 'calisthenics_mastery':
        return 'Calisthenics Skill';
      case 'fat_loss_recomp':
        return 'Metabolic Recomp';
      case 'cardio_endurance':
        return 'Aerobic Conditioning';
      case 'daily_health_longevity':
        return 'Longevity & Joint Flow';
      default:
        return 'Adaptive Routine';
    }
  });

  const title = goalTitles.length > 0
    ? goalTitles.join(' + ')
    : isGym
      ? 'Gym Strength & Hypertrophy'
      : 'Calisthenics Bodyweight Routine';

  return {
    id: `plan-${Date.now()}`,
    title,
    focusSummary: `${title} • ${tierLabel} • ${estimatedDurationMin} min • ~${estimatedCaloriesBurn} kcal`,
    tier,
    tierLabel,
    readinessMultiplierDesc,
    estimatedDurationMin,
    estimatedCaloriesBurn,
    equipmentMode,
    targetSkillMilestone,
    exercises,
    coachingNotes: isStrict
      ? `Strict Execution Directives: Adhere precisely to the target rep cadences and RPE limits. Record completed milestones to unlock higher progression tiers.`
      : `Health Directives: Honor your body's current readiness. Rest as needed, enjoy fluid movement, and build sustainable strength step by step.`,
    generatedDate: new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    sourceAttribution: 'Exercise data by RepDB (repdb.co)',
  };
}
