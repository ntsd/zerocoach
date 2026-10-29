import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { GeneratedWorkoutPlan, ExerciseItem } from '@/types/workout';
import { CoachingMode } from '@/types/coach';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { SelectRepDBExerciseModal } from './SelectRepDBExerciseModal';
import { WorkoutSummaryModal } from './WorkoutSummaryModal';
import { createExerciseItemFromRepDB } from '@/services/workout/workoutPlanGenerator';
import { RepDBExercise } from '@/types/exercise';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useTranslation } from '@/i18n';
import {
  Dumbbell,
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  Sparkles,
  ArrowRight,
  Info,
  Flame,
  Activity,
  Database,
  Layers,
  Eye,
  SkipForward,
  RotateCcw,
  RefreshCw,
  Minus,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-react-native';

import { formatDateDisplay } from '@/components/common/DateNavigationBar';

interface AdaptiveWorkoutCardProps {
  plan: GeneratedWorkoutPlan;
  mode: CoachingMode;
  onAskCoach: (plan: GeneratedWorkoutPlan) => void;
  date?: string;
}

function formatEquipment(eq?: string): string {
  if (!eq) return 'Bodyweight';
  return eq
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatMuscle(muscle?: string): string {
  if (!muscle) return '';
  return muscle
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const AdaptiveWorkoutCard: React.FC<AdaptiveWorkoutCardProps> = ({
  plan,
  mode,
  onAskCoach,
  date,
}) => {
  const { t } = useTranslation();
  const modeColors = getModeColors(mode);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const currentDateStr = date || todayDateStr;
  const isToday = currentDateStr === todayDateStr;
  const { activeDraft, historyByDate, plansByDate, saveDraft, finishWorkout, savePlanForDate } = useWorkoutStore();
  const sessionForDate = historyByDate[currentDateStr];

  // Stateful exercises in the workout (restores from completed session, draft, or stored plan)
  const [exercises, setExercises] = useState<ExerciseItem[]>(() => {
    if (sessionForDate) {
      return sessionForDate.exercises;
    }
    if (activeDraft && activeDraft.date === currentDateStr && activeDraft.planId === plan.id) {
      return activeDraft.exercises;
    }
    if (plansByDate[currentDateStr] && plansByDate[currentDateStr].exercises?.length > 0) {
      return plansByDate[currentDateStr].exercises;
    }
    return plan.exercises;
  });

  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>(() => {
    if (sessionForDate) {
      const map: Record<string, boolean> = {};
      sessionForDate.completedExerciseIds.forEach((id) => {
        map[id] = true;
      });
      return map;
    }
    if (activeDraft && activeDraft.date === currentDateStr && activeDraft.planId === plan.id) {
      return activeDraft.completedExercises;
    }
    return {};
  });

  const [skippedExercises, setSkippedExercises] = useState<Record<string, boolean>>(() => {
    if (sessionForDate) {
      const map: Record<string, boolean> = {};
      sessionForDate.skippedExerciseIds.forEach((id) => {
        map[id] = true;
      });
      return map;
    }
    if (activeDraft && activeDraft.date === currentDateStr && activeDraft.planId === plan.id) {
      return activeDraft.skippedExercises;
    }
    return {};
  });

  const startedAtRef = useRef<number>(
    sessionForDate?.startedAt || activeDraft?.startedAt || Date.now()
  );

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const selectedExerciseForModal = exercises.find((ex) => ex.id === selectedExerciseId) || null;

  // RepDB Modal states (for adding or swapping)
  const [isRepDBModalVisible, setIsRepDBModalVisible] = useState(false);
  const [swapTargetExercise, setSwapTargetExercise] = useState<ExerciseItem | null>(null);

  // Workout Summary completion modal
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);

  // Auto-save workout draft to local AsyncStorage
  useEffect(() => {
    if (sessionForDate) return; // Already finalized on this date
    if (!isToday) return; // Only auto-save active draft for today
    saveDraft({
      date: currentDateStr,
      planId: plan.id,
      exercises,
      completedExercises,
      skippedExercises,
      startedAt: startedAtRef.current,
      lastUpdatedAt: Date.now(),
    });
  }, [
    exercises,
    completedExercises,
    skippedExercises,
    plan.id,
    currentDateStr,
    sessionForDate,
    isToday,
    saveDraft,
  ]);

  // Persist workout plan changes for the active date so AI Agent and App UI stay in sync
  useEffect(() => {
    if (!sessionForDate && exercises.length > 0) {
      savePlanForDate(currentDateStr, {
        ...plan,
        exercises,
        generatedDate: currentDateStr,
      });
    }
  }, [exercises, currentDateStr, sessionForDate, plan, savePlanForDate]);

  // Synchronize when the generated plan changes (e.g. split switch or goal change)
  const prevPlanIdRef = useRef(plan.id);
  useEffect(() => {
    if (prevPlanIdRef.current !== plan.id) {
      prevPlanIdRef.current = plan.id;
      if (!sessionForDate) {
        setExercises(plan.exercises);
        setCompletedExercises({});
        setSkippedExercises({});
        startedAtRef.current = Date.now();
      }
    }
  }, [plan.id, plan.exercises, sessionForDate]);

  const toggleExercise = (id: string) => {
    // Cannot toggle completion if exercise is skipped
    if (skippedExercises[id]) return;
    setCompletedExercises((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleSkipExercise = (id: string) => {
    setSkippedExercises((prev) => {
      const nextSkipped = !prev[id];
      if (nextSkipped) {
        // If skipped, unmark completion
        setCompletedExercises((compPrev) => ({ ...compPrev, [id]: false }));
      }
      return {
        ...prev,
        [id]: nextSkipped,
      };
    });
  };

  const handleOpenAddModal = () => {
    setSwapTargetExercise(null);
    setIsRepDBModalVisible(true);
  };

  const handleStartSwap = (exercise: ExerciseItem) => {
    setSwapTargetExercise(exercise);
    setIsRepDBModalVisible(true);
  };

  const handleSelectRepDBExercise = (repDb: RepDBExercise) => {
    if (swapTargetExercise) {
      // Swapping target exercise with new RepDB movement
      const replacement = createExerciseItemFromRepDB(
        repDb,
        swapTargetExercise.category,
        swapTargetExercise.targetSets,
        swapTargetExercise.targetReps,
        swapTargetExercise.restPeriodSeconds,
        `Replaced ${swapTargetExercise.name}`
      );
      setExercises((prev) =>
        prev.map((ex) => (ex.id === swapTargetExercise.id ? replacement : ex))
      );
      // Clean up completion & skip states
      setCompletedExercises((prev) => {
        const copy = { ...prev };
        delete copy[swapTargetExercise.id];
        return copy;
      });
      setSkippedExercises((prev) => {
        const copy = { ...prev };
        delete copy[swapTargetExercise.id];
        return copy;
      });
      setSwapTargetExercise(null);
    } else {
      // Adding new exercise from RepDB to the workout
      const newExercise = createExerciseItemFromRepDB(
        repDb,
        'skill',
        3,
        '8–12 reps',
        90,
        'Custom Added Skill'
      );
      newExercise.isCustomAdded = true;
      setExercises((prev) => [...prev, newExercise]);
    }
  };

  const handleRemoveExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
    setCompletedExercises((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setSkippedExercises((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleUpdateSets = (exerciseId: string, deltaOrValue: number, isAbsolute: boolean = false) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const newSets = isAbsolute
          ? Math.max(1, Math.min(15, deltaOrValue))
          : Math.max(1, Math.min(15, ex.targetSets + deltaOrValue));
        return {
          ...ex,
          targetSets: newSets,
        };
      })
    );
  };

  const handleUpdateReps = (exerciseId: string, newReps: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          targetReps: newReps,
        };
      })
    );
  };

  const handleAskCoachForExercise = (exerciseName: string) => {
    onAskCoach({
      ...plan,
      exercises,
      coachingNotes: `Coach, guide me through optimal biomechanics, kinetic alignment, and set/rep execution for "${exerciseName}" based on my readiness.`,
    });
  };

  // Progress metrics calculated against active (non-skipped) exercises
  const activeExercises = exercises.filter((ex) => !skippedExercises[ex.id]);
  const completedCount = activeExercises.filter((ex) => completedExercises[ex.id]).length;
  const skippedCount = exercises.filter((ex) => skippedExercises[ex.id]).length;
  const totalActiveCount = activeExercises.length;
  const progressPercent = totalActiveCount > 0 ? Math.round((completedCount / totalActiveCount) * 100) : 0;

  const getCategoryColor = (category: ExerciseItem['category']) => {
    switch (category) {
      case 'warmup':
        return COLORS.textSecondary;
      case 'skill':
        return modeColors.accent;
      case 'strength':
        return COLORS.strict.accent;
      case 'metabolic':
        return COLORS.warning;
      case 'cooldown':
        return COLORS.purpleAccent;
      default:
        return COLORS.textMuted;
    }
  };

  const getTierColor = () => {
    switch (plan.tier) {
      case 'peak':
        return COLORS.success;
      case 'optimal':
        return modeColors.accent;
      case 'deload':
        return COLORS.strict.accent;
      default:
        return COLORS.textSecondary;
    }
  };

  const tierColor = getTierColor();

  const handleConfirmFinish = (summary: {
    durationMinutes: number;
    caloriesBurned: number;
    notes?: string;
  }) => {
    const completedIds = exercises.filter((ex) => completedExercises[ex.id]).map((ex) => ex.id);
    const skippedIds = exercises.filter((ex) => skippedExercises[ex.id]).map((ex) => ex.id);
    const totalSets = exercises
      .filter((ex) => completedExercises[ex.id])
      .reduce((acc, ex) => acc + ex.targetSets, 0);

    finishWorkout({
      date: currentDateStr,
      planId: plan.id,
      title: sessionForDate?.title || plan.title,
      split: sessionForDate?.split || plan.selectedSplit || 'full_body',
      tier: sessionForDate?.tier || plan.tier,
      exercises,
      completedExerciseIds: completedIds,
      skippedExerciseIds: skippedIds,
      totalMovements: exercises.length,
      completedMovements: completedIds.length,
      totalSets,
      durationMinutes: summary.durationMinutes,
      caloriesBurned: summary.caloriesBurned,
      startedAt: startedAtRef.current,
    });

    setIsSummaryModalVisible(false);
  };

  return (
    <>
      <GlassCard glowColor={`${tierColor}30`} borderColor={`${tierColor}40`} style={styles.card}>
        {/* Completed Session Status Banner */}
        {sessionForDate && (
          <View style={styles.completedSessionBanner}>
            <View style={styles.completedBannerLeft}>
              <View style={[styles.completedIconBox, { backgroundColor: `${COLORS.success}20` }]}>
                <CheckCircle2 size={16} color={COLORS.success} />
              </View>
              <View style={styles.completedTextCol}>
                <Text style={styles.completedBannerTitle}>
                  {isToday
                    ? t.workout.card.loggedToday
                    : t.workout.card.loggedOnDate.replace('{date}', formatDateDisplay(currentDateStr).toUpperCase())}
                </Text>
                <Text style={styles.completedBannerSub}>
                  {sessionForDate.durationMinutes}m • {sessionForDate.caloriesBurned} kcal • {sessionForDate.completedMovements} {t.common.movements} • {sessionForDate.totalSets} {t.common.sets}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsSummaryModalVisible(true)}
              style={styles.reopenBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={[styles.reopenBtnText, { color: modeColors.accent }]}>{t.common.edit}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header Badge Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: `${modeColors.accent}20` }]}>
              <Dumbbell size={16} color={modeColors.accent} />
            </View>
            <View style={styles.headerTitleBox}>
              <Text style={styles.planSuperTitle}>{t.workout.card.planSuperTitle}</Text>
              <Text style={styles.planTitle}>{sessionForDate?.title || plan.title}</Text>
            </View>
          </View>

          <View style={[styles.tierBadge, { borderColor: tierColor }]}>
            <Zap size={11} color={tierColor} />
            <Text style={[styles.tierBadgeText, { color: tierColor }]}>{plan.tierLabel}</Text>
          </View>
        </View>

        {/* Meta Specs (Duration, Calories, Movements, Mode) */}
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Clock size={11} color={COLORS.textSecondary} />
            <Text style={styles.metaPillText}>~{plan.estimatedDurationMin} {t.common.min.toUpperCase()}</Text>
          </View>

          {plan.estimatedCaloriesBurn && (
            <View style={styles.metaPill}>
              <Flame size={11} color={COLORS.warning} />
              <Text style={[styles.metaPillText, { color: COLORS.warning }]}>
                ~{plan.estimatedCaloriesBurn} {t.common.kcal.toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.metaPill}>
            <Activity size={11} color={modeColors.accent} />
            <Text style={[styles.metaPillText, { color: modeColors.accent }]}>
              {exercises.length} {t.workout.summaryModal.movements}
            </Text>
          </View>

          <View style={styles.metaPill}>
            <Text style={styles.metaPillDate}>
              {plan.equipmentMode === 'bodyweight' ? t.workout.card.bodyweight : t.workout.card.allGym}
            </Text>
          </View>

          {plan.skillLevel && (
            <View
              style={[
                styles.metaPill,
                { borderColor: `${modeColors.accent}50`, backgroundColor: `${modeColors.accent}15` },
              ]}
            >
              <Text style={[styles.metaPillText, { color: modeColors.accent, fontWeight: '700', fontSize: 10 }]}>
                {plan.skillLevel.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Readiness Autoregulation Guidance Banner */}
        <View style={styles.guidanceBanner}>
          <Info size={14} color={tierColor} />
          <Text style={styles.guidanceText}>{plan.readinessMultiplierDesc}</Text>
        </View>

        {/* Target Milestone Highlight */}
        {plan.targetSkillMilestone && (
          <View style={styles.milestoneHighlight}>
            <Sparkles size={13} color={COLORS.warning} />
            <Text style={styles.milestoneLabel}>{t.workout.card.targetMilestone}</Text>
            <Text style={styles.milestoneValue} numberOfLines={1}>
              {plan.targetSkillMilestone}
            </Text>
          </View>
        )}

        {/* Completion Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfoRow}>
            <Text style={styles.progressLabel}>{t.workout.card.sessionCompletion}</Text>
            <Text style={[styles.progressValText, { color: modeColors.accent }]}>
              {t.workout.card.ofCompleted
                .replace('{done}', String(completedCount))
                .replace('{total}', String(totalActiveCount))
                .replace('{pct}', String(progressPercent))}
              {skippedCount > 0 ? ` • ${t.workout.card.skippedNotice.replace('{count}', String(skippedCount))}` : ''}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: modeColors.accent },
              ]}
            />
          </View>
        </View>

        {/* Exercises List */}
        <View style={styles.exerciseList}>
          {exercises.map((item) => {
            const isDone = !!completedExercises[item.id];
            const isSkipped = !!skippedExercises[item.id];
            const catColor = getCategoryColor(item.category);
            const firstMuscle = item.primaryMuscles?.[0];

            return (
              <View
                key={item.id}
                style={[
                  styles.exerciseItem,
                  isDone && styles.exerciseItemDone,
                  isSkipped && styles.exerciseItemSkipped,
                ]}
              >
                <View style={styles.exerciseItemTop}>
                  {/* Checkbox (independent touch target) */}
                  <TouchableOpacity
                    style={styles.checkboxWrapper}
                    onPress={() => toggleExercise(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                    disabled={isSkipped}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} color={COLORS.success} />
                    ) : (
                      <Circle
                        size={18}
                        color={isSkipped ? 'rgba(255, 255, 255, 0.2)' : COLORS.textMuted}
                      />
                    )}
                  </TouchableOpacity>

                  {/* Thumbnail Image from RepDB (clickable preview) */}
                  {item.imageUrl ? (
                    <TouchableOpacity
                      onPress={() => setSelectedExerciseId(item.id)}
                      activeOpacity={0.8}
                      style={[styles.thumbnailWrapper, isSkipped && styles.thumbnailSkipped]}
                    >
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.thumbnailImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ) : null}

                  {/* Title & Category & Controls */}
                  <View style={styles.exerciseDetails}>
                    <TouchableOpacity
                      onPress={() => setSelectedExerciseId(item.id)}
                      activeOpacity={0.75}
                      style={styles.exerciseHeaderClickable}
                    >
                      <View style={styles.catBadgeRow}>
                        <View style={styles.catBadgeLeft}>
                          <View
                            style={[
                              styles.catBadge,
                              { borderColor: `${catColor}50`, backgroundColor: `${catColor}15` },
                            ]}
                          >
                            <Text style={[styles.catBadgeText, { color: catColor }]}>
                              {item.category.toUpperCase()}
                            </Text>
                          </View>

                          {item.isCustomAdded && (
                            <View style={styles.customBadge}>
                              <Text style={styles.customBadgeText}>{t.workout.card.added}</Text>
                            </View>
                          )}

                          {isSkipped && (
                            <View style={styles.skippedBadge}>
                              <Text style={styles.skippedBadgeText}>
                                {t.workout.summaryModal.skipped.toUpperCase()}
                              </Text>
                            </View>
                          )}

                          {!isSkipped && (
                            <Text style={styles.intensityTag} numberOfLines={1}>
                              {item.intensityNote}
                            </Text>
                          )}
                        </View>

                        <View style={styles.previewHintBadge}>
                          <Eye size={10} color={COLORS.textMuted} />
                          <Text style={styles.previewHintText}>{t.workout.card.preview}</Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.exerciseName,
                          isDone && styles.exerciseNameDone,
                          isSkipped && styles.exerciseNameSkipped,
                        ]}
                      >
                        {item.name}
                      </Text>

                      {/* RepDB Biomechanical Specs Row */}
                      {!isSkipped && (
                        <View style={styles.badgeTagsRow}>
                          {item.equipment && (
                            <View style={styles.tagBadge}>
                              <Dumbbell size={9} color={COLORS.textMuted} />
                              <Text style={styles.tagBadgeText}>{formatEquipment(item.equipment)}</Text>
                            </View>
                          )}

                          {item.mechanic && (
                            <View style={styles.tagBadge}>
                              <Layers size={9} color={COLORS.textMuted} />
                              <Text style={styles.tagBadgeText}>
                                {item.mechanic.charAt(0).toUpperCase() + item.mechanic.slice(1)}
                              </Text>
                            </View>
                          )}

                          {firstMuscle && (
                            <View style={styles.tagBadge}>
                              <Text style={styles.tagBadgeText}>{formatMuscle(firstMuscle)}</Text>
                            </View>
                          )}

                          {item.met && (
                            <View style={styles.metTagBadge}>
                              <Text style={styles.metTagText}>{item.met} MET</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Volume (Interactive Sets Stepper x Reps, Rest) */}
                    {!isSkipped && (
                      <View style={styles.volumeRow}>
                        <View style={styles.setStepperContainer}>
                          <TouchableOpacity
                            onPress={() => handleUpdateSets(item.id, -1)}
                            disabled={item.targetSets <= 1}
                            style={[
                              styles.setStepperBtn,
                              item.targetSets <= 1 && styles.setStepperBtnDisabled,
                            ]}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            activeOpacity={0.7}
                          >
                            <Minus
                              size={10}
                              color={item.targetSets <= 1 ? 'rgba(255, 255, 255, 0.2)' : modeColors.accent}
                            />
                          </TouchableOpacity>

                          <View style={styles.setNumberBadge}>
                            <Text style={[styles.setNumberText, { color: modeColors.accent }]}>
                              {item.targetSets}
                            </Text>
                            <Text style={styles.setNumberLabel}>{t.workout.card.sets}</Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleUpdateSets(item.id, 1)}
                            disabled={item.targetSets >= 15}
                            style={[
                              styles.setStepperBtn,
                              item.targetSets >= 15 && styles.setStepperBtnDisabled,
                            ]}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            activeOpacity={0.7}
                          >
                            <Plus
                              size={10}
                              color={item.targetSets >= 15 ? 'rgba(255, 255, 255, 0.2)' : modeColors.accent}
                            />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={() => setSelectedExerciseId(item.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.volumeRepsText}>× {item.targetReps}</Text>
                        </TouchableOpacity>

                        <View style={styles.restBadge}>
                          <Clock size={9} color={COLORS.textMuted} />
                          <Text style={styles.restText}>
                            {t.workout.card.restSeconds.replace('{sec}', String(item.restPeriodSeconds))}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Coaching Cue Box */}
                    {!isSkipped && (
                      <TouchableOpacity
                        onPress={() => setSelectedExerciseId(item.id)}
                        activeOpacity={0.8}
                        style={styles.cueBox}
                      >
                        <Text style={styles.cueLabel}>{t.workout.card.cue}</Text>
                        <Text style={styles.cueText}>{item.coachingCue}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Bottom Actions Bar on each exercise: Skip / Restore, Swap, Delete */}
                <View style={styles.itemActionsBar}>
                  <TouchableOpacity
                    onPress={() => toggleSkipExercise(item.id)}
                    style={[styles.itemActionPill, isSkipped && styles.itemActionPillActive]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    {isSkipped ? (
                      <>
                        <RotateCcw size={11} color={COLORS.warning} />
                        <Text style={[styles.itemActionPillText, { color: COLORS.warning }]}>
                          {t.workout.card.restore}
                        </Text>
                      </>
                    ) : (
                      <>
                        <SkipForward size={11} color={COLORS.textMuted} />
                        <Text style={styles.itemActionPillText}>{t.workout.card.skip}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleStartSwap(item)}
                    style={styles.itemActionPill}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={11} color={COLORS.textMuted} />
                    <Text style={styles.itemActionPillText}>{t.workout.card.swap}</Text>
                  </TouchableOpacity>

                  {item.isCustomAdded && (
                    <TouchableOpacity
                      onPress={() => handleRemoveExercise(item.id)}
                      style={[styles.itemActionPill, styles.itemActionPillDelete]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={11} color={COLORS.danger} />
                      <Text style={[styles.itemActionPillText, { color: COLORS.danger }]}>
                        {t.workout.card.remove}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Add Skill / Exercise from RepDB Button */}
        <TouchableOpacity
          onPress={handleOpenAddModal}
          style={[styles.addExerciseBtn, { borderColor: `${modeColors.accent}45` }]}
          activeOpacity={0.8}
        >
          <View style={[styles.addExerciseIconCircle, { backgroundColor: `${modeColors.accent}20` }]}>
            <Plus size={15} color={modeColors.accent} />
          </View>
          <View style={styles.addExerciseTextCol}>
            <Text style={[styles.addExerciseTitle, { color: modeColors.accent }]}>
              {t.workout.card.addRepDb}
            </Text>
            <Text style={styles.addExerciseSubtitle}>
              {t.workout.card.addRepDbSub}
            </Text>
          </View>
        </TouchableOpacity>

        {/* RepDB Dataset Attribution Footer */}
        <View style={styles.repDbAttributionRow}>
          <Database size={11} color={COLORS.textMuted} />
          <Text style={styles.repDbAttributionText}>
            {t.workout.card.repDbAttribution}
          </Text>
        </View>

        {/* Finish Workout CTA Button */}
        <TouchableOpacity
          onPress={() => setIsSummaryModalVisible(true)}
          style={[
            styles.finishWorkoutBtn,
            sessionForDate
              ? { backgroundColor: `${COLORS.success}20`, borderColor: `${COLORS.success}60` }
              : completedCount > 0
              ? { backgroundColor: COLORS.success, borderColor: COLORS.success }
              : { backgroundColor: `${modeColors.accent}20`, borderColor: `${modeColors.accent}50` },
          ]}
          activeOpacity={0.85}
        >
          <Trophy
            size={16}
            color={
              sessionForDate
                ? COLORS.success
                : completedCount > 0
                ? COLORS.background
                : modeColors.accent
            }
          />
          <Text
            style={[
              styles.finishWorkoutBtnText,
              {
                color:
                  sessionForDate
                    ? COLORS.success
                    : completedCount > 0
                    ? COLORS.background
                    : modeColors.accent,
              },
            ]}
          >
            {sessionForDate
              ? t.workout.card.editWorkoutBtn
              : completedCount > 0
              ? t.workout.card.finishWorkoutBtn
              : t.workout.card.resumeWorkoutBtn}
          </Text>
        </TouchableOpacity>

        {/* Ask Coach CTA */}
        <TouchableOpacity
          onPress={() => onAskCoach({ ...plan, exercises })}
          style={[styles.askCoachBtn, { backgroundColor: modeColors.accent }]}
          activeOpacity={0.85}
        >
          <Sparkles size={16} color={COLORS.textDark} />
          <Text style={styles.askCoachBtnText}>{t.workout.askCoachPlan}</Text>
          <ArrowRight size={14} color={COLORS.textDark} />
        </TouchableOpacity>
      </GlassCard>

      {/* Exercise Detail & Start/Peak Pose Preview Modal */}
      <ExerciseDetailModal
        visible={Boolean(selectedExerciseForModal)}
        exercise={selectedExerciseForModal}
        isCompleted={
          selectedExerciseForModal
            ? Boolean(completedExercises[selectedExerciseForModal.id])
            : false
        }
        onToggleComplete={() => {
          if (selectedExerciseForModal) {
            toggleExercise(selectedExerciseForModal.id);
          }
        }}
        onUpdateSets={(newSets) => {
          if (selectedExerciseForModal) {
            handleUpdateSets(selectedExerciseForModal.id, newSets, true);
          }
        }}
        onUpdateReps={(newReps) => {
          if (selectedExerciseForModal) {
            handleUpdateReps(selectedExerciseForModal.id, newReps);
          }
        }}
        onClose={() => setSelectedExerciseId(null)}
        onAskCoach={handleAskCoachForExercise}
        mode={mode}
      />

      {/* RepDB Exercise Selector / Swapper Modal */}
      <SelectRepDBExerciseModal
        visible={isRepDBModalVisible}
        onClose={() => {
          setIsRepDBModalVisible(false);
          setSwapTargetExercise(null);
        }}
        onSelectExercise={handleSelectRepDBExercise}
        mode={mode}
        swapTargetExercise={swapTargetExercise}
      />

      {/* Workout Summary Completion Modal */}
      <WorkoutSummaryModal
        visible={isSummaryModalVisible}
        onClose={() => setIsSummaryModalVisible(false)}
        onConfirmFinish={handleConfirmFinish}
        plan={plan}
        completedExercises={exercises.filter((ex) => completedExercises[ex.id])}
        skippedExercises={exercises.filter((ex) => skippedExercises[ex.id])}
        mode={mode}
        initialDurationMin={sessionForDate?.durationMinutes || plan.estimatedDurationMin}
        initialCaloriesBurn={sessionForDate?.caloriesBurned || plan.estimatedCaloriesBurn || 220}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  headerTitleBox: {
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSuperTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
  },
  planTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  tierBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  metaPillText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  metaPillDate: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  guidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  guidanceText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  milestoneHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  milestoneLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.warning,
    fontWeight: '800',
  },
  milestoneValue: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textPrimary,
    flex: 1,
  },
  progressContainer: {
    gap: 4,
    marginTop: 2,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  progressValText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: COLORS.cardSecondary,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.round,
  },
  exerciseList: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  exerciseItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  exerciseItemDone: {
    opacity: 0.6,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  exerciseItemSkipped: {
    opacity: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  exerciseItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkboxWrapper: {
    paddingTop: 2,
  },
  thumbnailWrapper: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.xs,
    backgroundColor: '#0A0E14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  thumbnailSkipped: {
    opacity: 0.5,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  exerciseDetails: {
    flex: 1,
    gap: 4,
  },
  catBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  catBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    flexWrap: 'wrap',
  },
  previewHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
  },
  previewHintText: {
    ...TYPOGRAPHY.badge,
    fontSize: 8.5,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  catBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 8,
    fontWeight: '800',
  },
  customBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.35)',
  },
  customBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 8,
    color: COLORS.strict.accent,
    fontWeight: '800',
  },
  skippedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  skippedBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 8,
    color: COLORS.warning,
    fontWeight: '800',
  },
  intensityTag: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  exerciseName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  exerciseNameDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  exerciseNameSkipped: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  badgeTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 1,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tagBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  metTagBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  metTagText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 9,
    color: COLORS.warning,
  },
  exerciseHeaderClickable: {
    // Interactive header touch target
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  setStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 3,
    paddingVertical: 2,
    gap: 3,
  },
  setStepperBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setStepperBtnDisabled: {
    opacity: 0.25,
    backgroundColor: 'transparent',
  },
  setNumberBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: 2,
  },
  setNumberText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
    fontWeight: '800',
  },
  setNumberLabel: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  volumeRepsText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  volumeAccent: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  restText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  cueBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 6,
    borderRadius: RADIUS.xs,
    marginTop: 3,
  },
  cueLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: '800',
    paddingTop: 1,
  },
  cueText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 14,
  },
  itemActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    marginLeft: 26,
  },
  itemActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemActionPillActive: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  itemActionPillDelete: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  itemActionPillText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: 4,
  },
  addExerciseIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExerciseTextCol: {
    flex: 1,
  },
  addExerciseTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
  },
  addExerciseSubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  repDbAttributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
    marginTop: 2,
  },
  repDbAttributionText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  askCoachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  askCoachBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textDark,
  },
  completedSessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${COLORS.success}15`,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.success}45`,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  completedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    flex: 1,
  },
  completedIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTextCol: {
    flex: 1,
  },
  completedBannerTitle: {
    ...TYPOGRAPHY.badge,
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  completedBannerSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  reopenBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  reopenBtnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '700',
  },
  finishWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  finishWorkoutBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    fontWeight: '800',
  },
});
