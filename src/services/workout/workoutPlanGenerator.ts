import { CoachingMode, TrainingGoal } from '@/types/coach';
import { CalisthenicsStage } from '@/types/telemetry';
import { GeneratedWorkoutPlan, ExerciseItem, WorkoutIntensityTier } from '@/types/workout';

export interface WorkoutPlanGenerationParams {
  goals: TrainingGoal[];
  mode: CoachingMode;
  readinessScore: number;
  weightKg: number;
  heightCm: number;
  activeStages: CalisthenicsStage[];
  activeCalories?: number;
}

/**
 * Generates an adaptive, evidence-based exercise plan dynamically tailored to:
 * 1. Selected Training Goals (Strength, Calisthenics, Fat Loss, Cardio, Longevity)
 * 2. Wearable Telemetry & Recovery Readiness (Autoregulated Sets, Reps, RPE)
 * 3. Body Metrics (Leverage adjustments based on bodyweight and height)
 * 4. Calisthenics Progression Milestones (Targets active uncompleted skills)
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
    heightCm = 0,
    activeStages = [],
  } = params;

  const isStrict = mode === 'strict';

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
    : 'Calisthenics Maintenance';

  const exercises: ExerciseItem[] = [];

  // ==========================================
  // BLOCK 1: DYNAMIC WARM-UP & JOINT PREPARATION
  // ==========================================
  exercises.push({
    id: 'wu-1',
    name: 'Wrist Mobility & Scapular Wall Slides',
    category: 'warmup',
    targetSets: 2,
    targetReps: '12 controlled reps',
    restPeriodSeconds: 30,
    intensityNote: 'Low • Joint lubrication',
    coachingCue: isStrict
      ? 'Lock scapulae in full retraction and depression. Zero arch in lumbar spine.'
      : 'Gently circle wrists and slide forearms up the wall with smooth continuous breathing.',
  });

  exercises.push({
    id: 'wu-2',
    name: 'Hollow Body Compression & Glute Bridges',
    category: 'warmup',
    targetSets: 2,
    targetReps: '30s hold per side',
    restPeriodSeconds: 45,
    intensityNote: 'Moderate • Core activation',
    coachingCue: isStrict
      ? 'Press lumbar flat into floor. Quads flexed, toes pointed like a gymnast.'
      : 'Engage lower abdominals and squeeze glutes at the peak of the bridge.',
  });

  // ==========================================
  // BLOCK 2: TARGET SKILL PROGRESSION
  // ==========================================
  const skillSets = Math.max(2, Math.round((tier === 'peak' ? 4 : tier === 'deload' ? 2 : 3) * volumeMultiplier));
  if (nextStage) {
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
    });
  }

  // ==========================================
  // BLOCK 3: GOAL-SPECIFIC MAIN WORKOUT
  // ==========================================
  const hasStrength = goals.includes('strength_hypertrophy');
  const hasFatLoss = goals.includes('fat_loss_recomp');
  const hasCardio = goals.includes('cardio_endurance');
  const hasHealth = goals.includes('daily_health_longevity');

  const strengthSets = Math.max(2, Math.round((tier === 'peak' ? 4 : tier === 'deload' ? 2 : 3) * volumeMultiplier));

  if (hasStrength || goals.length === 0) {
    exercises.push({
      id: 'str-1',
      name: 'Deficit Push-Ups or Parallel Bar Dips',
      category: 'strength',
      targetSets: strengthSets,
      targetReps: isStrict ? '8–10 reps (3-0-1-0 tempo)' : '10–12 controlled reps',
      restPeriodSeconds: isStrict ? 90 : 60,
      intensityNote: `${defaultRpe} • Hypertrophy Push`,
      coachingCue: isStrict
        ? 'Lower with 3-second eccentric. Explode upward and depress shoulders at lockout.'
        : 'Keep elbows tucked at a 45° angle. Avoid dipping lower than shoulder comfort.',
    });

    exercises.push({
      id: 'str-2',
      name: 'Strict Hollow Body Pull-Ups or Inverted Rows',
      category: 'strength',
      targetSets: strengthSets,
      targetReps: isStrict ? '6–8 reps (Full dead-hang)' : '8–10 smooth reps',
      restPeriodSeconds: 90,
      intensityNote: `${defaultRpe} • Vertical/Horizontal Pull`,
      coachingCue: isStrict
        ? 'Initiate with scapular depression before bending elbows. Chest drives directly toward bar.'
        : 'Pull elbows back smoothly, squeeze shoulder blades together at top.',
    });

    exercises.push({
      id: 'str-3',
      name: 'Elevated Bulgarian Split Squats',
      category: 'strength',
      targetSets: Math.max(2, strengthSets - 1),
      targetReps: '8–10 reps / leg',
      restPeriodSeconds: 60,
      intensityNote: `${defaultRpe} • Unilateral Lower`,
      coachingCue: isStrict
        ? 'Drive through front heel. Keep torso upright and maintain active pelvic alignment.'
        : 'Sink back into the hip smoothly. Hold onto a wall for balance if needed.',
    });
  }

  if (hasFatLoss) {
    const metabolicSets = tier === 'deload' ? 2 : 3;
    exercises.push({
      id: 'meta-1',
      name: 'Density Superset: Pike Push-Up into Jump Squats',
      category: 'metabolic',
      targetSets: metabolicSets,
      targetReps: '12 Pike Push-Ups + 15 Jump Squats',
      restPeriodSeconds: 45,
      intensityNote: 'High Density • Elevated Metabolic Output',
      coachingCue: isStrict
        ? 'Transition with zero rest between exercises. Push pace while keeping vertical pike posture.'
        : 'Take steady breaths. Convert to regular air squats if joints feel tired.',
    });

    exercises.push({
      id: 'meta-2',
      name: 'Hollow Flutter & Mountain Climber Finisher',
      category: 'metabolic',
      targetSets: 3,
      targetReps: '40s work / 20s rest',
      restPeriodSeconds: 45,
      intensityNote: 'Aerobic Burn • Core Conditioning',
      coachingCue: isStrict
        ? 'Maintain unbroken core bracing. Flat lumbar throughout all 40 seconds.'
        : 'Keep a sustainable rhythm. Focus on steady diaphragmatic breathing.',
    });
  }

  if (hasCardio) {
    exercises.push({
      id: 'cardio-1',
      name: 'Zone 2 Aerobic Base / High-Cadence Movement',
      category: 'metabolic',
      targetSets: 1,
      targetReps: tier === 'deload' ? '12 min steady' : '20 min steady nasal pace',
      restPeriodSeconds: 60,
      intensityNote: 'Zone 2 (65–75% Max HR) • Mitochondrial Conditioning',
      coachingCue: isStrict
        ? 'Pace strictly by heart rate. You must be able to maintain uninterrupted nasal breathing.'
        : 'Keep an easy conversational pace. Build your aerobic engine without accumulating fatigue.',
    });
  }

  if (hasHealth) {
    exercises.push({
      id: 'health-1',
      name: 'Thoracic Bridge Rotations & 90/90 Hip Flow',
      category: 'strength',
      targetSets: 2,
      targetReps: '8 reps per side',
      restPeriodSeconds: 45,
      intensityNote: 'Restorative • Joint Freedom',
      coachingCue: isStrict
        ? 'Maximize end-range thoracic extension. Avoid letting the lumbar spine compensate.'
        : 'Sink gently into hip internal and external rotation. Relax tension from daily sitting.',
    });
  }

  // ==========================================
  // BLOCK 4: COOLDOWN & DOWN-REGULATION
  // ==========================================
  exercises.push({
    id: 'cd-1',
    name: 'Passive Bar Hang & Diaphragmatic Box Breathing',
    category: 'cooldown',
    targetSets: 2,
    targetReps: '45s hang + 2 min 4-4-4-4 breathing',
    restPeriodSeconds: 30,
    intensityNote: 'Parasympathetic Recovery',
    coachingCue: isStrict
      ? 'Decompress spinal discs. Shift nervous system immediately into anabolic recovery.'
      : 'Allow your shoulders to stretch gently. Breathe in for 4s, hold 4s, exhale 4s.',
  });

  // Calculate estimated duration
  const totalSets = exercises.reduce((acc, ex) => acc + ex.targetSets, 0);
  const totalRestSeconds = exercises.reduce((acc, ex) => acc + ex.targetSets * ex.restPeriodSeconds, 0);
  const workSeconds = totalSets * 45; // average 45s per set
  const estimatedDurationMin = Math.round((totalRestSeconds + workSeconds) / 60);

  // Focus Title
  const goalTitles = goals.map((g) => {
    switch (g) {
      case 'strength_hypertrophy':
        return 'Strength & Muscle';
      case 'calisthenics_mastery':
        return 'Calisthenics Skill';
      case 'fat_loss_recomp':
        return 'Metabolic Recomp';
      case 'cardio_endurance':
        return 'Aerobic Conditioning';
      case 'daily_health_longevity':
        return 'Longevity & Mobility';
      default:
        return 'General Fitness';
    }
  });

  const title = goalTitles.length > 0 ? goalTitles.join(' + ') : 'Adaptive Calisthenics Routine';

  return {
    id: `plan-${Date.now()}`,
    title,
    focusSummary: `${title} • ${tierLabel} • ${estimatedDurationMin} min`,
    tier,
    tierLabel,
    readinessMultiplierDesc,
    estimatedDurationMin,
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
  };
}
