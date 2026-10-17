import { CoachingMode, TrainingGoal, Sex, SkillLevel } from '@/types/coach';
import { CalisthenicsStage } from '@/types/telemetry';
import {
  GeneratedWorkoutPlan,
  ExerciseItem,
  WorkoutIntensityTier,
  WorkoutSplit,
  CoachSplitRecommendation,
} from '@/types/workout';
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
  sex?: Sex;
  skillLevel?: SkillLevel;
  selectedSplit?: WorkoutSplit;
}

const REPDB_MEDIA_BASE_URL = 'https://raw.githubusercontent.com/RepDB/exercise-dataset/main/';

export function getRepDBImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${REPDB_MEDIA_BASE_URL}${path.replace(/^\//, '')}`;
}

/**
 * Maps a RepDB exercise item to the UI ExerciseItem model
 */
export function createExerciseItemFromRepDB(
  repDb: RepDBExercise,
  category: ExerciseItem['category'] = 'strength',
  targetSets: number = 3,
  targetReps: string = '8–12 reps',
  restPeriodSeconds: number = 90,
  intensityNote: string = 'Standard Sets',
  customCue?: string
): ExerciseItem {
  const defaultCue =
    repDb.tips_en && repDb.tips_en.length > 0
      ? repDb.tips_en[0]
      : 'Maintain crisp cadence and full range of motion.';

  const imagesFlat = repDb.images?.flat;
  const imageStartUrl = getRepDBImageUrl(imagesFlat?.start);
  const imagePeakUrl = getRepDBImageUrl(imagesFlat?.peak);
  const imageMainUrl = getRepDBImageUrl(imagesFlat?.main);
  const primaryImageUrl = imagePeakUrl || imageMainUrl || imageStartUrl;

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
    secondaryMuscles: repDb.secondary_muscles,
    mechanic: repDb.mechanic,
    difficulty: repDb.difficulty,
    isBodyweight: repDb.is_bodyweight,
    met: repDb.met || 5.0,
    imageUrl: primaryImageUrl,
    imageStartUrl,
    imagePeakUrl: imagePeakUrl || imageMainUrl,
    instructions: repDb.instructions_en || [],
    forceType: repDb.force_type,
    tips: repDb.tips_en || [],
  };
}

/**
 * Evaluates athlete goal, skill level, readiness score, and equipment to recommend the optimal workout split
 */
export function getCoachSplitRecommendation(
  params: WorkoutPlanGenerationParams
): CoachSplitRecommendation {
  const {
    goals = [],
    skillLevel = 'intermediate',
    readinessScore = 0,
    equipmentMode = 'all',
  } = params;

  const primaryGoal = goals[0] || 'strength_hypertrophy';
  const isGym = equipmentMode === 'all';

  // 1. CNS & Recovery Readiness Autoregulation
  if (readinessScore > 0 && readinessScore < 55) {
    return {
      recommendedSplit: 'core_mobility',
      splitTitle: 'Core & Joint Mobility',
      badge: 'RECOVERY AUTOREGULATION',
      headline: 'Active Recovery & CNS Decompression',
      reasoning: `Readiness is depressed (${readinessScore}/100). Coach prescribes Core & Joint Mobility today to reduce articular stress, facilitate lymphatic drainage, and protect your nervous system.`,
      focusMuscles: ['Core', 'Spine', 'Thoracic Mobility', 'Pelvic Alignment'],
    };
  }

  // 2. Calisthenics Mastery
  if (primaryGoal === 'calisthenics_mastery' || !isGym) {
    if (readinessScore >= 80) {
      return {
        recommendedSplit: 'calisthenics_skills',
        splitTitle: 'Calisthenics Skills & Levers',
        badge: 'PEAK SKILL PROTOCOL',
        headline: 'Gymnastic Mastery & Tendon Conditioning',
        reasoning: `Peak readiness (${readinessScore}/100) provides the ideal neural window for high-threshold bodyweight levers, dips, and progression milestones.`,
        focusMuscles: ['Lats', 'Core Hollow Body', 'Anterior Delts', 'Scapulae'],
      };
    }
    if (skillLevel === 'beginner') {
      return {
        recommendedSplit: 'full_body',
        splitTitle: 'Full Body Calisthenics',
        badge: 'FOUNDATION ACCELERATOR',
        headline: 'Movement Pattern Frequency',
        reasoning: `For beginner calisthenics athletes, full-body stimulation 3x weekly builds foundational tendon resilience, scapular control, and core bracing faster than isolated splits.`,
        focusMuscles: ['Full Body', 'Core Bracing', 'Scapulae'],
      };
    }
    return {
      recommendedSplit: 'push',
      splitTitle: 'Push Skills (Push-Ups & Dips)',
      badge: 'SKILL PROGRESSION',
      headline: 'Horizontal & Overhead Pushing Strength',
      reasoning: `Progressing pushing biomechanics (push-up regressions and dip lockouts) establishes the shoulder stability required for elite levers.`,
      focusMuscles: ['Pectorals', 'Anterior Delts', 'Triceps'],
    };
  }

  // 3. Fat Loss & Metabolic Recomposition
  if (primaryGoal === 'fat_loss_recomp') {
    return {
      recommendedSplit: 'full_body',
      splitTitle: 'Full Body Metabolic Recomp',
      badge: 'HIGH EPOC METABOLIC BURN',
      headline: 'Systemic Caloric Expenditure',
      reasoning: `Full-body compound complexes recruit maximum motor units, elevating post-exercise oxygen consumption (EPOC) and optimizing fat oxidation while preserving lean mass.`,
      focusMuscles: ['Full Body', 'Quads', 'Back', 'Core'],
    };
  }

  // 4. Cardio & Aerobic Endurance
  if (primaryGoal === 'cardio_endurance') {
    return {
      recommendedSplit: 'cardio_engine',
      splitTitle: 'Cardio Engine & Conditioning',
      badge: 'AEROBIC THRESHOLD',
      headline: 'Mitochondrial Density & Zone 2 Base',
      reasoning: `Sustained cardiovascular intervals develop aerobic work capacity, stroke volume, and metabolic clearance to elevate systemic stamina.`,
      focusMuscles: ['Cardiovascular System', 'Legs', 'Core'],
    };
  }

  // 5. Daily Health & Longevity
  if (primaryGoal === 'daily_health_longevity') {
    if (skillLevel === 'beginner' || readinessScore < 70) {
      return {
        recommendedSplit: 'core_mobility',
        splitTitle: 'Core, Posture & Longevity Flow',
        badge: 'JOINT & POSTURAL VITALITY',
        headline: 'Spinal Articulation & Deep Core Stability',
        reasoning: `Daily Health & Longevity benefits most from spinal decompression, rotator cuff activation, glute firing, and thoracic flow to counter sedentary stress.`,
        focusMuscles: ['Lumbar Spine', 'Thoracic Spine', 'Glutes', 'Deep Core'],
      };
    }
    return {
      recommendedSplit: 'full_body',
      splitTitle: 'Full Body Functional Longevity',
      badge: 'FUNCTIONAL HYPERTROPHY',
      headline: 'Balanced Joint Preservation Routine',
      reasoning: `Balanced full-body compound loading preserves bone mineral density and functional strength while minimizing unilateral joint wear.`,
      focusMuscles: ['Full Body', 'Posterior Chain', 'Core'],
    };
  }

  // 6. Strength & Hypertrophy
  if (skillLevel === 'beginner') {
    return {
      recommendedSplit: 'full_body',
      splitTitle: 'Full Body Compound Protocol',
      badge: 'BEGINNER ACCELERATOR',
      headline: 'Frequent Neuromuscular Motor Learning',
      reasoning: `Beginners build muscle and strength 35% faster on a Full-Body 3x/week schedule due to frequent motor pattern reinforcement and elevated Muscle Protein Synthesis.`,
      focusMuscles: ['Chest', 'Back', 'Quads', 'Hamstrings', 'Core'],
    };
  }

  if (skillLevel === 'advanced') {
    if (readinessScore >= 80) {
      return {
        recommendedSplit: 'push',
        splitTitle: 'Heavy Push Hypertrophy',
        badge: 'PEAK OVERLOAD PROTOCOL',
        headline: 'Maximum Mechanical Tension (Push Focus)',
        reasoning: `High readiness (${readinessScore}/100) allows maximum mechanical load on horizontal and overhead pressing without CNS breakdown. Ideal for personal record progression.`,
        focusMuscles: ['Pectorals', 'Anterior Delts', 'Triceps'],
      };
    }
    return {
      recommendedSplit: 'pull',
      splitTitle: 'Posterior Chain & Pull Focus',
      badge: 'PROGRESSIVE OVERLOAD',
      headline: 'Latissimus & Trapezius Hypertrophy',
      reasoning: `Targeted back and posterior chain training optimizes scapular retraction, lat thickness, and elbow flexor development.`,
      focusMuscles: ['Lats', 'Rhomboids', 'Traps', 'Biceps'],
    };
  }

  // Intermediate Strength & Hypertrophy: Day-of-week rotation
  const day = new Date().getDay(); // 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
  if (day === 1 || day === 4) {
    return {
      recommendedSplit: 'push',
      splitTitle: 'Push (Chest, Shoulders, Triceps)',
      badge: 'HYPERTROPHY SPLIT',
      headline: 'Horizontal & Vertical Pressing Volume',
      reasoning: `Push session targeting horizontal chest overload, clavicular deltoid volume, and tricep mechanical tension.`,
      focusMuscles: ['Chest', 'Shoulders', 'Triceps'],
    };
  } else if (day === 2 || day === 5) {
    return {
      recommendedSplit: 'pull',
      splitTitle: 'Pull (Back, Biceps, Rear Delts)',
      badge: 'HYPERTROPHY SPLIT',
      headline: 'Lat Thickness & Vertical Pulling Power',
      reasoning: `Pull session developing lat width, rhomboid retraction, and bicep recruitment.`,
      focusMuscles: ['Lats', 'Biceps', 'Rear Delts'],
    };
  } else if (day === 3 || day === 6) {
    return {
      recommendedSplit: 'legs',
      splitTitle: 'Legs & Lower Body Power',
      badge: 'HYPERTROPHY SPLIT',
      headline: 'Quadriceps, Hamstrings & Glutes',
      reasoning: `Lower body session targeting squat and hinge motor patterns with unilateral stabilization.`,
      focusMuscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
    };
  }

  return {
    recommendedSplit: 'full_body',
    splitTitle: 'Full Body Hypertrophy',
    badge: 'OPTIMAL RECOVERY SPLIT',
    headline: 'High-Density Compound Routine',
    reasoning: `Balanced full-body protocol to stimulate all primary kinetic chains while maintaining joint health.`,
    focusMuscles: ['Full Body'],
  };
}

/**
 * Generates an adaptive, evidence-based exercise plan dynamically tailored to:
 * 1. Equipment Environment (Full Gym vs Bodyweight/Home)
 * 2. User Skill Level (Beginner, Intermediate, Advanced)
 * 3. Selected Workout Split (Full Body, Push, Pull, Legs, Upper, Lower, Core, Calisthenics, Cardio)
 * 4. User Training Goals (Strength, Calisthenics, Fat Loss, Cardio, Longevity)
 * 5. Telemetry & Readiness (Autoregulated Sets, Reps, RPE)
 * 6. RepDB Open Exercise Dataset (643 exercises)
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
    sex = 'male',
    skillLevel = 'intermediate',
    selectedSplit,
  } = params;

  const isStrict = mode === 'strict';
  const isGym = equipmentMode === 'all';
  const isFemale = sex === 'female';
  const isMale = sex === 'male';

  // Compute coach recommendation
  const coachRec = getCoachSplitRecommendation(params);
  const activeSplit: WorkoutSplit = selectedSplit || coachRec.recommendedSplit;

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
      `Optimal recovery (${readinessScore}/100). High neural drive. Target progressive overload and priority PRs.`;
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

  // 2. Set/Rep Schemes Based on Skill Level & Biological Sex
  let compoundSets: number;
  let accessorySets: number;
  let compoundReps: string;
  let accessoryReps: string;
  let compoundRestSec: number;
  let accessoryRestSec: number;

  if (skillLevel === 'beginner') {
    compoundSets = Math.max(2, Math.round((tier === 'peak' ? 3 : tier === 'deload' ? 2 : 3) * volumeMultiplier));
    accessorySets = 2;
    compoundReps = tier === 'deload' ? '8 reps (light)' : '8–10 controlled reps';
    accessoryReps = '10–12 smooth reps';
    compoundRestSec = 75;
    accessoryRestSec = 60;
  } else if (skillLevel === 'advanced') {
    compoundSets = Math.max(3, Math.round((tier === 'peak' ? 5 : tier === 'deload' ? 2 : 4) * volumeMultiplier));
    accessorySets = Math.max(2, Math.round(3 * volumeMultiplier));
    compoundReps = isFemale
      ? tier === 'peak' ? '5–7 heavy reps' : '6–8 strict reps'
      : isMale
        ? tier === 'peak' ? '3–5 heavy reps' : '5–6 explosive reps'
        : '5–7 reps';
    accessoryReps = '8–10 high-tension reps';
    compoundRestSec = tier === 'peak' ? 150 : 120;
    accessoryRestSec = 75;
  } else {
    // Intermediate
    compoundSets = Math.max(2, Math.round((tier === 'peak' ? 4 : tier === 'deload' ? 2 : 3) * volumeMultiplier));
    accessorySets = Math.max(2, Math.round((tier === 'deload' ? 2 : 3) * volumeMultiplier));
    compoundReps = isFemale
      ? tier === 'peak' ? '6–8 strict reps' : '8–10 controlled reps'
      : isMale
        ? tier === 'peak' ? '4–6 heavy reps' : '6–8 explosive reps'
        : '6–8 reps';
    accessoryReps = isFemale ? '12–15 continuous tension reps' : '8–12 controlled reps';
    compoundRestSec = isFemale ? (tier === 'peak' ? 90 : 60) : (tier === 'peak' ? 120 : 90);
    accessoryRestSec = isFemale ? 45 : 60;
  }

  // 3. Resolve Target Milestone from Progression Stages
  const wantsCalisthenics = goals.includes('calisthenics_mastery') || !isGym || activeSplit === 'calisthenics_skills';
  const nextStage = wantsCalisthenics
    ? activeStages.find((s) => !s.completed && !s.skipped && s.category === 'bodyweight') ||
      activeStages.find((s) => !s.completed && !s.skipped)
    : activeStages.find((s) => !s.completed && !s.skipped && s.category === 'gym') ||
      activeStages.find((s) => !s.completed && !s.skipped);

  let targetSkillMilestone: string;
  if (nextStage) {
    targetSkillMilestone = `${nextStage.skillName} Stage ${nextStage.stageNumber}: ${nextStage.stageTitle}`;
  } else if (isGym) {
    targetSkillMilestone = 'Barbell Bench Press: Progressive Hypertrophy Benchmark';
  } else {
    targetSkillMilestone = 'Strict Bodyweight Progression Standards';
  }

  const exercises: ExerciseItem[] = [];

  // ==========================================
  // DYNAMIC WARM-UP & MOBILITY (Split-Specific)
  // ==========================================
  let warmup1Id = 'cat-cow';
  let warmup1Sets = 2;
  let warmup1Reps = '10–12 fluid reps';
  let warmup1Rest = 30;
  let warmup1Intensity = 'Low • Spinal Articulation';
  let warmup1Cue = 'Synchronize breath: inhale into thoracic extension, exhale into posterior pelvic tuck.';

  let warmup2Id: string | undefined = 'glute-bridge';
  let warmup2Sets = 2;
  let warmup2Reps = '12 paused glute contractions';
  let warmup2Rest = 30;
  let warmup2Intensity = 'Moderate • Pelvic & Core Activation';
  let warmup2Cue = 'Drive through heels, squeeze glutes at the peak for 2 seconds.';

  if (activeSplit === 'push') {
    warmup1Id = isGym ? 'bench-chest-stretch' : 'doorway-chest-stretch';
    warmup1Reps = '30s hold per side';
    warmup1Intensity = 'Low • Pectoral & Anterior Deltoid Opening';
    warmup1Cue = 'Open the chest wall gently without flaring the ribcage.';

    warmup2Id = 'downward-dog-to-plank';
    warmup2Reps = '8 slow fluid transitions';
    warmup2Intensity = 'Moderate • Scapular Stability & Serratus Activation';
    warmup2Cue = 'Push the floor away at the top of the plank to activate serratus anterior.';
  } else if (activeSplit === 'pull') {
    warmup1Id = 'band-pull-apart';
    warmup1Reps = '12–15 continuous tension reps';
    warmup1Intensity = 'Low • Scapular Retraction & Rotator Cuff Primer';
    warmup1Cue = 'Lead with the rear delts and pinch the scapulae firmly together.';

    warmup2Id = 'bench-lat-stretch';
    warmup2Reps = '30s deep stretch';
    warmup2Intensity = 'Moderate • Latissimus & Thoracic Mobility';
    warmup2Cue = 'Sink hips backward while maintaining lengthened lats and neutral neck.';
  } else if (activeSplit === 'legs' || activeSplit === 'lower') {
    warmup1Id = 'downward-dog-to-low-lunge';
    warmup1Reps = '6–8 slow lunges / side';
    warmup1Intensity = 'Low • Dynamic Hip Flexor & Psoas Articulation';
    warmup1Cue = 'Drop hips down and forward while keeping the front heel planted.';

    warmup2Id = 'deep-squat-hold';
    warmup2Reps = '30–45s deep primal hold';
    warmup2Intensity = 'Moderate • Ankle Dorsiflexion & Hip Capsule Opener';
    warmup2Cue = 'Keep chest upright, push knees outward with elbows, and breathe into the pelvic floor.';
  } else if (activeSplit === 'upper') {
    warmup1Id = 'band-pull-apart';
    warmup1Reps = '12 reps';
    warmup1Intensity = 'Low • Rotator Cuff & Posterior Girdle Primer';
    warmup1Cue = 'Keep shoulders depressed away from ears during retraction.';

    warmup2Id = 'bench-chest-stretch';
    warmup2Reps = '30s hold';
    warmup2Intensity = 'Moderate • Pectoral Opening';
    warmup2Cue = 'Gently open anterior shoulder fibers before pressing.';
  } else if (activeSplit === 'cardio_engine') {
    warmup1Id = 'jumping-jacks';
    warmup1Reps = '45s rhythmic cadence';
    warmup1Intensity = 'Low • Core Temperature & CNS Elevation';
    warmup1Cue = 'Land softly on the balls of your feet with continuous rhythmic breathing.';

    warmup2Id = 'inchworm';
    warmup2Reps = '6 controlled walkouts';
    warmup2Intensity = 'Moderate • Hamstring & Shoulder Priming';
    warmup2Cue = 'Hinge at the hips, walk hands forward into plank, and walk back with straight legs.';
  } else if (activeSplit === 'calisthenics_skills') {
    warmup1Id = 'downward-dog-to-plank';
    warmup1Reps = '8 slow transitions';
    warmup1Intensity = 'Low • Scapular Protraction & Hollow Primer';
    warmup1Cue = 'Emphasize strong scapular protraction and hollow body tuck at the plank.';

    warmup2Id = 'bench-lat-stretch';
    warmup2Reps = '30s hold';
    warmup2Intensity = 'Moderate • Overhead Shoulder Girdle Mobility';
    warmup2Cue = 'Decompress thoracic spine and lengthen latissimus dorsi.';
  } else {
    // core_mobility / full_body / daily_health_longevity
    warmup1Id = 'cat-cow';
    warmup1Reps = '10–12 fluid reps';
    warmup1Intensity = 'Low • Spinal Articulation & Pelvic Tilt';
    warmup1Cue = 'Synchronize breath: inhale into thoracic extension, exhale into posterior pelvic tuck.';

    warmup2Id = 'glute-bridge';
    warmup2Reps = '12 paused glute contractions';
    warmup2Intensity = 'Moderate • Pelvic & Core Activation';
    warmup2Cue = 'Drive through heels and lock glutes at peak contraction.';
  }

  // Push Warmup 1
  const ex1 = exerciseRepository.getById(warmup1Id) || exerciseRepository.getById('cat-cow');
  if (ex1) {
    exercises.push(
      createExerciseItemFromRepDB(
        ex1,
        'warmup',
        warmup1Sets,
        warmup1Reps,
        warmup1Rest,
        warmup1Intensity,
        isStrict ? warmup1Cue : ex1.tips_en?.[0] || warmup1Cue
      )
    );
  }

  // Push Warmup 2
  if (warmup2Id) {
    const ex2 = exerciseRepository.getById(warmup2Id) || exerciseRepository.getById('glute-bridge');
    if (ex2) {
      exercises.push(
        createExerciseItemFromRepDB(
          ex2,
          'warmup',
          warmup2Sets,
          warmup2Reps,
          warmup2Rest,
          warmup2Intensity,
          isStrict ? warmup2Cue : ex2.tips_en?.[0] || warmup2Cue
        )
      );
    }
  }

  // ==========================================
  // SPLIT-SPECIFIC ROUTINES (RepDB)
  // ==========================================
  switch (activeSplit) {
    // ------------------------------------------
    // 1. PUSH SPLIT
    // ------------------------------------------
    case 'push': {
      if (isGym) {
        // Horizontal Press Compound
        const benchId = skillLevel === 'beginner' ? 'chest-press-machine' : 'bench-press';
        const bench = exerciseRepository.getById(benchId) || exerciseRepository.getById('bench-press');
        if (bench) {
          exercises.push(
            createExerciseItemFromRepDB(
              bench,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Primary Horizontal Press`,
              bench.tips_en?.[0]
            )
          );
        }

        // Incline / Secondary Press
        const dbBench = exerciseRepository.getById('db-bench-press');
        if (dbBench) {
          exercises.push(
            createExerciseItemFromRepDB(
              dbBench,
              'strength',
              accessorySets,
              accessoryReps,
              accessoryRestSec,
              `${defaultRpe} • Dumbbell Hypertrophy Press`,
              dbBench.tips_en?.[0]
            )
          );
        }

        // Overhead Press
        const arnold = exerciseRepository.getById('arnold-press');
        if (arnold) {
          exercises.push(
            createExerciseItemFromRepDB(
              arnold,
              'strength',
              accessorySets,
              accessoryReps,
              accessoryRestSec,
              `${defaultRpe} • Deltoid Compound`,
              arnold.tips_en?.[0]
            )
          );
        }

        // Triceps / Dips
        const dipId = skillLevel === 'advanced' ? 'ring-dips' : skillLevel === 'beginner' ? 'bench-dips' : 'dips';
        const dip = exerciseRepository.getById(dipId) || exerciseRepository.getById('dips');
        if (dip) {
          exercises.push(
            createExerciseItemFromRepDB(
              dip,
              'strength',
              accessorySets,
              skillLevel === 'advanced' ? '6–8 weighted reps' : '8–12 strict reps',
              accessoryRestSec,
              `${defaultRpe} • Tricep & Sternal Overload`,
              dip.tips_en?.[0]
            )
          );
        }

        // Delts / Lateral Raise
        const lateral = exerciseRepository.getById('lateral-raise');
        if (lateral) {
          exercises.push(
            createExerciseItemFromRepDB(
              lateral,
              'strength',
              2,
              '12–15 strict reps',
              45,
              'Deltoid Isolation',
              lateral.tips_en?.[0]
            )
          );
        }
      } else {
        // Bodyweight Push Split
        const pushId = skillLevel === 'beginner'
          ? 'incline-push-ups'
          : skillLevel === 'advanced'
            ? 'archer-push-ups'
            : 'push-up';
        const push = exerciseRepository.getById(pushId) || exerciseRepository.getById('push-up');
        if (push) {
          exercises.push(
            createExerciseItemFromRepDB(
              push,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Primary Horizontal Push`,
              push.tips_en?.[0]
            )
          );
        }

        // Pike / Vertical Push
        const pike = exerciseRepository.getById('pike-push-ups');
        if (pike) {
          exercises.push(
            createExerciseItemFromRepDB(
              pike,
              'strength',
              accessorySets,
              skillLevel === 'beginner' ? '6–8 reps' : '8–10 strict reps',
              compoundRestSec,
              `${defaultRpe} • Vertical Deltoid Push`,
              pike.tips_en?.[0]
            )
          );
        }

        // Dips / Triceps
        const dipId = skillLevel === 'beginner' ? 'bench-dips' : 'close-grip-push-ups';
        const dip = exerciseRepository.getById(dipId) || exerciseRepository.getById('bench-dips');
        if (dip) {
          exercises.push(
            createExerciseItemFromRepDB(
              dip,
              'strength',
              accessorySets,
              accessoryReps,
              accessoryRestSec,
              `${defaultRpe} • Tricep & Chest Extension`,
              dip.tips_en?.[0]
            )
          );
        }

        // Diamond Push-Ups
        const diamond = exerciseRepository.getById('diamond-push-ups');
        if (diamond) {
          exercises.push(
            createExerciseItemFromRepDB(
              diamond,
              'strength',
              2,
              '8–12 reps',
              60,
              'Medial Tricep Overload',
              diamond.tips_en?.[0]
            )
          );
        }
      }
      break;
    }

    // ------------------------------------------
    // 2. PULL SPLIT
    // ------------------------------------------
    case 'pull': {
      if (isGym) {
        // Horizontal Pull
        const rowId = skillLevel === 'beginner' ? 'chest-supported-kettlebell-row' : 'barbell-row';
        const row = exerciseRepository.getById(rowId) || exerciseRepository.getById('barbell-row');
        if (row) {
          exercises.push(
            createExerciseItemFromRepDB(
              row,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Primary Horizontal Pull`,
              row.tips_en?.[0]
            )
          );
        }

        // Vertical Pull
        const latPullId = skillLevel === 'advanced' ? 'weighted-pull-up' : skillLevel === 'beginner' ? 'lat-pulldown' : 'pull-up';
        const latPull = exerciseRepository.getById(latPullId) || exerciseRepository.getById('lat-pulldown');
        if (latPull) {
          exercises.push(
            createExerciseItemFromRepDB(
              latPull,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Vertical Lat Overload`,
              latPull.tips_en?.[0]
            )
          );
        }

        // Dumbbell Row Accessory
        const dbRow = exerciseRepository.getById('bent-over-db-row');
        if (dbRow) {
          exercises.push(
            createExerciseItemFromRepDB(
              dbRow,
              'strength',
              accessorySets,
              accessoryReps,
              accessoryRestSec,
              `${defaultRpe} • Unilateral Lat Isolation`,
              dbRow.tips_en?.[0]
            )
          );
        }

        // Scapular & Rear Delt: Face Pull
        const facePull = exerciseRepository.getById('face-pull');
        if (facePull) {
          exercises.push(
            createExerciseItemFromRepDB(
              facePull,
              'strength',
              accessorySets,
              '12–15 crisp reps',
              45,
              'Rotator Cuff & Rhomboids',
              facePull.tips_en?.[0]
            )
          );
        }

        // Bicep Isolation
        const curl = exerciseRepository.getById('bicep-curl') || exerciseRepository.getById('barbell-curl');
        if (curl) {
          exercises.push(
            createExerciseItemFromRepDB(
              curl,
              'strength',
              2,
              accessoryReps,
              45,
              'Elbow Flexor Hypertrophy',
              curl.tips_en?.[0]
            )
          );
        }
      } else {
        // Bodyweight Pull Split
        const pullId = skillLevel === 'beginner'
          ? 'assisted-pull-ups'
          : skillLevel === 'advanced'
            ? 'archer-pull-ups'
            : 'pull-up';
        const pull = exerciseRepository.getById(pullId) || exerciseRepository.getById('pull-up');
        if (pull) {
          exercises.push(
            createExerciseItemFromRepDB(
              pull,
              'strength',
              compoundSets,
              skillLevel === 'beginner' ? '6–8 reps' : compoundReps,
              compoundRestSec,
              `${defaultRpe} • Primary Vertical Pull`,
              pull.tips_en?.[0]
            )
          );
        }

        // Close Grip Pull-ups
        const closePull = exerciseRepository.getById('close-grip-pull-ups') || exerciseRepository.getById('pull-up');
        if (closePull) {
          exercises.push(
            createExerciseItemFromRepDB(
              closePull,
              'strength',
              accessorySets,
              '6–8 strict reps',
              accessoryRestSec,
              `${defaultRpe} • Bicep & Lower Lat Emphasis`,
              closePull.tips_en?.[0]
            )
          );
        }

        // Scapular Pull-ups
        const scapPull = exerciseRepository.getById('scapular-pull-ups');
        if (scapPull) {
          exercises.push(
            createExerciseItemFromRepDB(
              scapPull,
              'strength',
              2,
              '10–12 strict contractions',
              45,
              'Scapular Depressor Control',
              scapPull.tips_en?.[0]
            )
          );
        }

        // Core Hollow Body
        const hollow = exerciseRepository.getById('bench-hollow-hold') || exerciseRepository.getById('plank');
        if (hollow) {
          exercises.push(
            createExerciseItemFromRepDB(
              hollow,
              'strength',
              2,
              '30–45s hold',
              45,
              'Gymnastic Core Bracing',
              hollow.tips_en?.[0]
            )
          );
        }
      }
      break;
    }

    // ------------------------------------------
    // 3. LEGS SPLIT
    // ------------------------------------------
    case 'legs': {
      if (isGym) {
        // Primary Squat
        const squatId = skillLevel === 'beginner' ? 'goblet-squat' : 'squat';
        const squat = exerciseRepository.getById(squatId) || exerciseRepository.getById('squat');
        if (squat) {
          exercises.push(
            createExerciseItemFromRepDB(
              squat,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Primary Quad & Core Compound`,
              squat.tips_en?.[0]
            )
          );
        }

        // Hinge / Posterior Chain: Romanian Deadlift or Deadlift
        const deadliftId = skillLevel === 'advanced' ? 'deadlift' : 'romanian-deadlift';
        const deadlift = exerciseRepository.getById(deadliftId) || exerciseRepository.getById('deadlift');
        if (deadlift) {
          exercises.push(
            createExerciseItemFromRepDB(
              deadlift,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Posterior Chain & Glutes`,
              deadlift.tips_en?.[0]
            )
          );
        }

        // Unilateral: Bulgarian Split Squat
        const bulgarianId = skillLevel === 'advanced' ? 'barbell-bulgarian-split-squat' : 'bulgarian-split-squat';
        const bulgarian = exerciseRepository.getById(bulgarianId) || exerciseRepository.getById('bulgarian-split-squat');
        if (bulgarian) {
          exercises.push(
            createExerciseItemFromRepDB(
              bulgarian,
              'strength',
              accessorySets,
              '8–10 reps per leg',
              accessoryRestSec,
              `${defaultRpe} • Unilateral Hip Stabilization`,
              bulgarian.tips_en?.[0]
            )
          );
        }

        // Calves: Barbell Calf Raise
        const calf = exerciseRepository.getById('barbell-calf-raise');
        if (calf) {
          exercises.push(
            createExerciseItemFromRepDB(
              calf,
              'strength',
              2,
              '12–15 full ROM reps (2s stretch)',
              45,
              'Gastrocnemius & Soleus',
              calf.tips_en?.[0]
            )
          );
        }
      } else {
        // Bodyweight Legs
        const squatId = skillLevel === 'advanced'
          ? 'pistol-squat'
          : skillLevel === 'intermediate'
            ? 'bulgarian-split-squat'
            : 'bodyweight-squat';
        const squat = exerciseRepository.getById(squatId) || exerciseRepository.getById('bodyweight-squat');
        if (squat) {
          exercises.push(
            createExerciseItemFromRepDB(
              squat,
              'strength',
              compoundSets,
              skillLevel === 'advanced' ? '5–6 reps per leg' : compoundReps,
              compoundRestSec,
              `${defaultRpe} • Quad & Glute Compound`,
              squat.tips_en?.[0]
            )
          );
        }

        // Glute Bridge / Posterior
        const bridge = exerciseRepository.getById('glute-bridge');
        if (bridge) {
          exercises.push(
            createExerciseItemFromRepDB(
              bridge,
              'strength',
              accessorySets,
              '15 paused contractions',
              45,
              'Glute & Hamstring Bracing',
              bridge.tips_en?.[0]
            )
          );
        }

        // Cossack Squat (Frontal Plane Mobility)
        const cossack = exerciseRepository.getById('cossack-squat');
        if (cossack) {
          exercises.push(
            createExerciseItemFromRepDB(
              cossack,
              'strength',
              accessorySets,
              '8 reps per side',
              60,
              'Frontal Plane Mobility & Adductor Strength',
              cossack.tips_en?.[0]
            )
          );
        }

        // Bodyweight Calf Raise
        const calf = exerciseRepository.getById('bodyweight-calf-raise');
        if (calf) {
          exercises.push(
            createExerciseItemFromRepDB(
              calf,
              'strength',
              2,
              '20 paused contractions',
              45,
              'Calf & Ankle Stability',
              calf.tips_en?.[0]
            )
          );
        }
      }
      break;
    }

    // ------------------------------------------
    // 4. UPPER SPLIT
    // ------------------------------------------
    case 'upper': {
      if (isGym) {
        const bench = exerciseRepository.getById('bench-press');
        if (bench) {
          exercises.push(
            createExerciseItemFromRepDB(
              bench,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Horizontal Press`,
              bench.tips_en?.[0]
            )
          );
        }

        const row = exerciseRepository.getById('barbell-row');
        if (row) {
          exercises.push(
            createExerciseItemFromRepDB(
              row,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Horizontal Pull`,
              row.tips_en?.[0]
            )
          );
        }

        const arnold = exerciseRepository.getById('arnold-press');
        if (arnold) {
          exercises.push(
            createExerciseItemFromRepDB(
              arnold,
              'strength',
              accessorySets,
              accessoryReps,
              accessoryRestSec,
              `${defaultRpe} • Deltoid Compound`,
              arnold.tips_en?.[0]
            )
          );
        }

        const latPull = exerciseRepository.getById('lat-pulldown');
        if (latPull) {
          exercises.push(
            createExerciseItemFromRepDB(
              latPull,
              'strength',
              accessorySets,
              accessoryReps,
              accessoryRestSec,
              `${defaultRpe} • Vertical Pull`,
              latPull.tips_en?.[0]
            )
          );
        }
      } else {
        const push = exerciseRepository.getById('push-up');
        if (push) {
          exercises.push(
            createExerciseItemFromRepDB(
              push,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Horizontal Push`,
              push.tips_en?.[0]
            )
          );
        }

        const pull = exerciseRepository.getById('pull-up');
        if (pull) {
          exercises.push(
            createExerciseItemFromRepDB(
              pull,
              'strength',
              compoundSets,
              '6–8 dead-hang reps',
              compoundRestSec,
              `${defaultRpe} • Vertical Pull`,
              pull.tips_en?.[0]
            )
          );
        }

        const pike = exerciseRepository.getById('pike-push-ups');
        if (pike) {
          exercises.push(
            createExerciseItemFromRepDB(
              pike,
              'strength',
              accessorySets,
              '8–10 strict reps',
              60,
              'Overhead Push',
              pike.tips_en?.[0]
            )
          );
        }
      }
      break;
    }

    // ------------------------------------------
    // 5. LOWER SPLIT
    // ------------------------------------------
    case 'lower': {
      if (isGym) {
        const squat = exerciseRepository.getById('squat') || exerciseRepository.getById('goblet-squat');
        if (squat) {
          exercises.push(
            createExerciseItemFromRepDB(
              squat,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Primary Squat Compound`,
              squat.tips_en?.[0]
            )
          );
        }

        const deadlift = exerciseRepository.getById('deadlift');
        if (deadlift) {
          exercises.push(
            createExerciseItemFromRepDB(
              deadlift,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Posterior Chain`,
              deadlift.tips_en?.[0]
            )
          );
        }

        const bulgarian = exerciseRepository.getById('bulgarian-split-squat');
        if (bulgarian) {
          exercises.push(
            createExerciseItemFromRepDB(
              bulgarian,
              'strength',
              accessorySets,
              '10 reps / side',
              accessoryRestSec,
              'Unilateral Leg Hypertrophy',
              bulgarian.tips_en?.[0]
            )
          );
        }
      } else {
        const squat = exerciseRepository.getById('bodyweight-squat');
        if (squat) {
          exercises.push(
            createExerciseItemFromRepDB(
              squat,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Bodyweight Squat`,
              squat.tips_en?.[0]
            )
          );
        }

        const bridge = exerciseRepository.getById('glute-bridge');
        if (bridge) {
          exercises.push(
            createExerciseItemFromRepDB(
              bridge,
              'strength',
              accessorySets,
              '15 reps (2s hold)',
              45,
              'Posterior Chain & Glutes',
              bridge.tips_en?.[0]
            )
          );
        }

        const cossack = exerciseRepository.getById('cossack-squat');
        if (cossack) {
          exercises.push(
            createExerciseItemFromRepDB(
              cossack,
              'strength',
              accessorySets,
              '8 reps / side',
              60,
              'Frontal Plane Mobility',
              cossack.tips_en?.[0]
            )
          );
        }
      }
      break;
    }

    // ------------------------------------------
    // 6. CORE & MOBILITY SPLIT
    // ------------------------------------------
    case 'core_mobility': {
      const birdDog = exerciseRepository.getById('bird-dog');
      if (birdDog) {
        exercises.push(
          createExerciseItemFromRepDB(
            birdDog,
            'strength',
            3,
            '10 reps / side (2s hold)',
            30,
            'Low • Lumbar & Cross-Body Stabilization',
            birdDog.tips_en?.[0]
          )
        );
      }

      const deadBug = exerciseRepository.getById('dead-bug');
      if (deadBug) {
        exercises.push(
          createExerciseItemFromRepDB(
            deadBug,
            'strength',
            3,
            '10 reps / side (controlled)',
            30,
            'Anterior Core & Rib Cage Depression',
            deadBug.tips_en?.[0]
          )
        );
      }

      const plank = exerciseRepository.getById('plank');
      if (plank) {
        exercises.push(
          createExerciseItemFromRepDB(
            plank,
            'strength',
            3,
            skillLevel === 'beginner' ? '30s hold' : '45–60s isometric brace',
            45,
            'Isometric Core Bracing',
            plank.tips_en?.[0]
          )
        );
      }

      const sidePlank = exerciseRepository.getById('side-plank');
      if (sidePlank) {
        exercises.push(
          createExerciseItemFromRepDB(
            sidePlank,
            'strength',
            2,
            '30s hold / side',
            30,
            'Quadratus Lumborum & Oblique Bracing',
            sidePlank.tips_en?.[0]
          )
        );
      }

      const legRaise = exerciseRepository.getById('captains-chair-leg-raise') || exerciseRepository.getById('bench-hollow-hold');
      if (legRaise) {
        exercises.push(
          createExerciseItemFromRepDB(
            legRaise,
            'strength',
            2,
            '10–12 strict reps',
            45,
            'Lower Rectus Abdominis & Hip Flexor Control',
            legRaise.tips_en?.[0]
          )
        );
      }
      break;
    }

    // ------------------------------------------
    // 7. CALISTHENICS SKILLS SPLIT
    // ------------------------------------------
    case 'calisthenics_skills': {
      // 1. Skill Priority from Milestone
      if (nextStage) {
        exercises.push({
          id: `skill-${nextStage.id}`,
          name: `${nextStage.skillName}: ${nextStage.stageTitle}`,
          category: 'skill',
          targetSets: Math.max(3, Math.round(4 * volumeMultiplier)),
          targetReps: nextStage.standard.includes('sets of')
            ? nextStage.standard.replace(/\d+\s*sets\s*of\s*/i, '').trim()
            : '3–5 strict reps',
          restPeriodSeconds: tier === 'peak' ? 120 : 90,
          intensityNote: `${defaultRpe} • Priority Skill Hold`,
          coachingCue: isStrict
            ? `Strict Standard: ${nextStage.standard}. Focus on maximum tendon tension and clean lockouts.`
            : 'Work within your comfortable threshold. Stop 1-2 reps before mechanical breakdown.',
          equipment: 'calisthenics',
          bodyPart: 'full_body',
          primaryMuscles: ['rectus_abdominis', 'latissimus_dorsi'],
          mechanic: 'compound',
          difficulty: 'intermediate',
          isBodyweight: true,
          met: 6.0,
        });
      }

      // Vertical Pull Power
      const pullId = skillLevel === 'advanced' ? 'weighted-pull-up' : skillLevel === 'beginner' ? 'assisted-pull-ups' : 'pull-up';
      const pull = exerciseRepository.getById(pullId) || exerciseRepository.getById('pull-up');
      if (pull) {
        exercises.push(
          createExerciseItemFromRepDB(
            pull,
            'strength',
            compoundSets,
            compoundReps,
            compoundRestSec,
            `${defaultRpe} • Vertical Pull Strength`,
            pull.tips_en?.[0]
          )
        );
      }

      // Dips / Push Power
      const dipId = skillLevel === 'advanced' ? 'ring-dips' : skillLevel === 'beginner' ? 'bench-dips' : 'dips';
      const dip = exerciseRepository.getById(dipId) || exerciseRepository.getById('dips');
      if (dip) {
        exercises.push(
          createExerciseItemFromRepDB(
            dip,
            'strength',
            accessorySets,
            accessoryReps,
            accessoryRestSec,
            `${defaultRpe} • Gymnastic Pushing Power`,
            dip.tips_en?.[0]
          )
        );
      }

      // Hollow Body / L-Sit Prep
      const hollow = exerciseRepository.getById('bench-hollow-hold') || exerciseRepository.getById('plank');
      if (hollow) {
        exercises.push(
          createExerciseItemFromRepDB(
            hollow,
            'strength',
            3,
            '30–45s hold',
            45,
            'Hollow Body Compression',
            hollow.tips_en?.[0]
          )
        );
      }

      // Unilateral Leg Balance: Cossack or Pistol
      const legSkill = skillLevel === 'advanced'
        ? exerciseRepository.getById('pistol-squat')
        : exerciseRepository.getById('cossack-squat');
      if (legSkill) {
        exercises.push(
          createExerciseItemFromRepDB(
            legSkill,
            'strength',
            2,
            '6–8 reps / side',
            60,
            'Frontal Plane Leg Control',
            legSkill.tips_en?.[0]
          )
        );
      }
      break;
    }

    // ------------------------------------------
    // 8. CARDIO ENGINE SPLIT
    // ------------------------------------------
    case 'cardio_engine': {
      const jumpRope = exerciseRepository.getById('jump-rope');
      if (jumpRope) {
        exercises.push(
          createExerciseItemFromRepDB(
            jumpRope,
            'metabolic',
            3,
            '2 min continuous steady cadence',
            45,
            'Aerobic Base & Cadence',
            jumpRope.tips_en?.[0]
          )
        );
      }

      const burpee = exerciseRepository.getById('burpees');
      if (burpee) {
        exercises.push(
          createExerciseItemFromRepDB(
            burpee,
            'metabolic',
            3,
            '12–15 explosive reps',
            45,
            'Systemic Metabolic Output',
            burpee.tips_en?.[0]
          )
        );
      }

      const mountain = exerciseRepository.getById('mountain-climbers');
      if (mountain) {
        exercises.push(
          createExerciseItemFromRepDB(
            mountain,
            'metabolic',
            3,
            '45s high tempo intervals',
            30,
            'Core Conditioning & Heart Rate Spike',
            mountain.tips_en?.[0]
          )
        );
      }

      const toolEx = isGym ? exerciseRepository.getById('air-bike') || exerciseRepository.getById('kettlebell-swing') : exerciseRepository.getById('box-jump');
      if (toolEx) {
        exercises.push(
          createExerciseItemFromRepDB(
            toolEx,
            'metabolic',
            3,
            isGym ? '15 min Zone-2 tempo' : '10 snappy reps (step down safely)',
            60,
            'Cardiovascular Power',
            toolEx.tips_en?.[0]
          )
        );
      }
      break;
    }

    // ------------------------------------------
    // 9. FULL BODY (Default master routine)
    // ------------------------------------------
    case 'full_body':
    default: {
      if (isGym) {
        // Horizontal Press
        const bench = exerciseRepository.getById('bench-press');
        if (bench) {
          exercises.push(
            createExerciseItemFromRepDB(
              bench,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Horizontal Compound Press`,
              bench.tips_en?.[0]
            )
          );
        }

        // Horizontal Pull
        const row = exerciseRepository.getById('barbell-row');
        if (row) {
          exercises.push(
            createExerciseItemFromRepDB(
              row,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Horizontal Pull Compound`,
              row.tips_en?.[0]
            )
          );
        }

        // Lower Compound
        const lowerId = tier === 'peak' ? 'deadlift' : 'barbell-bulgarian-split-squat';
        const lower = exerciseRepository.getById(lowerId) || exerciseRepository.getById('deadlift');
        if (lower) {
          exercises.push(
            createExerciseItemFromRepDB(
              lower,
              'strength',
              accessorySets,
              isFemale ? '10–12 reps / leg' : compoundReps,
              compoundRestSec,
              `${defaultRpe} • Lower Chain Compound`,
              lower.tips_en?.[0]
            )
          );
        }

        // Overhead / Deltoid
        const arnold = exerciseRepository.getById('arnold-press');
        if (arnold) {
          exercises.push(
            createExerciseItemFromRepDB(
              arnold,
              'strength',
              accessorySets,
              accessoryReps,
              accessoryRestSec,
              `${defaultRpe} • Deltoid Compound`,
              arnold.tips_en?.[0]
            )
          );
        }
      } else {
        // Bodyweight Full Body
        const pushId = skillLevel === 'beginner' ? 'incline-push-ups' : skillLevel === 'advanced' ? 'archer-push-ups' : 'push-up';
        const push = exerciseRepository.getById(pushId) || exerciseRepository.getById('push-up');
        if (push) {
          exercises.push(
            createExerciseItemFromRepDB(
              push,
              'strength',
              compoundSets,
              compoundReps,
              compoundRestSec,
              `${defaultRpe} • Bodyweight Push Overload`,
              push.tips_en?.[0]
            )
          );
        }

        const pullId = skillLevel === 'beginner' ? 'assisted-pull-ups' : 'pull-up';
        const pull = exerciseRepository.getById(pullId) || exerciseRepository.getById('pull-up');
        if (pull) {
          exercises.push(
            createExerciseItemFromRepDB(
              pull,
              'strength',
              compoundSets,
              tier === 'deload' ? '4–6 controlled reps' : '6–8 dead-hang reps',
              compoundRestSec,
              `${defaultRpe} • Vertical Pull Compound`,
              pull.tips_en?.[0]
            )
          );
        }

        const squat = exerciseRepository.getById('cossack-squat') || exerciseRepository.getById('bodyweight-squat');
        if (squat) {
          exercises.push(
            createExerciseItemFromRepDB(
              squat,
              'strength',
              accessorySets,
              isFemale ? '10 reps / side' : '8 reps / side',
              accessoryRestSec,
              `${defaultRpe} • Frontal Plane Lower`,
              squat.tips_en?.[0]
            )
          );
        }

        const plank = exerciseRepository.getById('plank');
        if (plank) {
          exercises.push(
            createExerciseItemFromRepDB(
              plank,
              'strength',
              2,
              tier === 'peak' ? '60s hold' : '45s hold',
              45,
              'Isometric Core Bracing',
              plank.tips_en?.[0]
            )
          );
        }
      }
      break;
    }
  }

  // ==========================================
  // COOLDOWN & DOWN-REGULATION BLOCK
  // ==========================================
  const childPose = exerciseRepository.getById('childs-pose') || exerciseRepository.getById('cobra-stretch');
  if (childPose) {
    exercises.push(
      createExerciseItemFromRepDB(
        childPose,
        'cooldown',
        2,
        '45s deep stretch + diaphragmatic box breathing',
        30,
        'Parasympathetic Down-Regulation',
        childPose.tips_en?.[0]
      )
    );
  }

  // Calculations
  const totalSets = exercises.reduce((acc, ex) => acc + ex.targetSets, 0);
  const totalRestSeconds = exercises.reduce((acc, ex) => acc + ex.targetSets * ex.restPeriodSeconds, 0);
  const workSeconds = totalSets * 45;
  const estimatedDurationMin = Math.round((totalRestSeconds + workSeconds) / 60);

  const athleteWeight = weightKg > 0 ? weightKg : (isFemale ? 62 : 75);
  let calculatedCalories = 0;
  for (const ex of exercises) {
    const met = ex.met || 5.0;
    const exerciseMinutes = (ex.targetSets * (45 + ex.restPeriodSeconds)) / 60;
    calculatedCalories += met * athleteWeight * (exerciseMinutes / 60);
  }
  const estimatedCaloriesBurn = Math.max(120, Math.round(calculatedCalories / 5) * 5);

  // Format split title
  const splitTitles: Record<WorkoutSplit, string> = {
    full_body: isGym ? 'Full Gym Compound' : 'Full Body Calisthenics',
    push: isGym ? 'Push Focus (Chest & Delts)' : 'Push Skills (Push-Ups & Dips)',
    pull: isGym ? 'Pull Focus (Back & Biceps)' : 'Pull Skills (Pull-Ups & Levers)',
    legs: isGym ? 'Legs & Posterior Chain' : 'Legs & Pistols',
    upper: 'Upper Body Integration',
    lower: 'Lower Body & Core',
    core_mobility: 'Core & Joint Mobility',
    calisthenics_skills: 'Calisthenics Progression Mastery',
    cardio_engine: 'Cardio Engine & Conditioning',
  };

  const title = splitTitles[activeSplit] || 'Adaptive Routine';

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
      ? `Strict Execution Directives: Adhere precisely to the target rep cadences and RPE limits. Record completed sets to unlock higher progression tiers.`
      : `Health Directives: Honor your body's current readiness. Rest as needed, enjoy fluid movement, and build sustainable strength step by step.`,
    generatedDate: new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    sourceAttribution: 'Exercise data by RepDB (repdb.co)',
    skillLevel,
    selectedSplit: activeSplit,
    coachRecommendation: coachRec,
  };
}
