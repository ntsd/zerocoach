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
import { createExerciseItemFromRepDB } from '@/services/workout/workoutPlanGenerator';
import { RepDBExercise } from '@/types/exercise';
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
  Plus,
  Trash2,
} from 'lucide-react-native';

interface AdaptiveWorkoutCardProps {
  plan: GeneratedWorkoutPlan;
  mode: CoachingMode;
  onAskCoach: (plan: GeneratedWorkoutPlan) => void;
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
}) => {
  const modeColors = getModeColors(mode);
  
  // Stateful exercises in the workout (allows adding, swapping, or deleting)
  const [exercises, setExercises] = useState<ExerciseItem[]>(plan.exercises);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [skippedExercises, setSkippedExercises] = useState<Record<string, boolean>>({});
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<ExerciseItem | null>(null);

  // RepDB Modal states (for adding or swapping)
  const [isRepDBModalVisible, setIsRepDBModalVisible] = useState(false);
  const [swapTargetExercise, setSwapTargetExercise] = useState<ExerciseItem | null>(null);

  // Synchronize when the generated plan changes (e.g. split switch or goal change)
  const prevPlanIdRef = useRef(plan.id);
  useEffect(() => {
    if (prevPlanIdRef.current !== plan.id) {
      prevPlanIdRef.current = plan.id;
      setExercises(plan.exercises);
      setCompletedExercises({});
      setSkippedExercises({});
    }
  }, [plan.id, plan.exercises]);

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

  return (
    <>
      <GlassCard glowColor={`${tierColor}30`} borderColor={`${tierColor}40`} style={styles.card}>
        {/* Header Badge Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: `${modeColors.accent}20` }]}>
              <Dumbbell size={16} color={modeColors.accent} />
            </View>
            <View style={styles.headerTitleBox}>
              <Text style={styles.planSuperTitle}>DATA-GENERATED EXERCISE PLAN</Text>
              <Text style={styles.planTitle}>{plan.title}</Text>
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
            <Text style={styles.metaPillText}>~{plan.estimatedDurationMin} MIN</Text>
          </View>

          {plan.estimatedCaloriesBurn && (
            <View style={styles.metaPill}>
              <Flame size={11} color={COLORS.warning} />
              <Text style={[styles.metaPillText, { color: COLORS.warning }]}>
                ~{plan.estimatedCaloriesBurn} KCAL
              </Text>
            </View>
          )}

          <View style={styles.metaPill}>
            <Activity size={11} color={modeColors.accent} />
            <Text style={[styles.metaPillText, { color: modeColors.accent }]}>
              {exercises.length} MOVEMENTS
            </Text>
          </View>

          <View style={styles.metaPill}>
            <Text style={styles.metaPillDate}>
              {plan.equipmentMode === 'bodyweight' ? 'HOME / BODYWEIGHT' : 'ALL GYM'}
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
            <Text style={styles.milestoneLabel}>TARGET MILESTONE:</Text>
            <Text style={styles.milestoneValue} numberOfLines={1}>
              {plan.targetSkillMilestone}
            </Text>
          </View>
        )}

        {/* Completion Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfoRow}>
            <Text style={styles.progressLabel}>SESSION COMPLETION</Text>
            <Text style={[styles.progressValText, { color: modeColors.accent }]}>
              {completedCount} of {totalActiveCount} ({progressPercent}%)
              {skippedCount > 0 ? ` • ${skippedCount} skipped` : ''}
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
                <TouchableOpacity
                  onPress={() => setSelectedExerciseForModal(item)}
                  activeOpacity={0.8}
                  style={styles.exerciseItemTop}
                >
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

                  {/* Thumbnail Image from RepDB */}
                  {item.imageUrl ? (
                    <View style={[styles.thumbnailWrapper, isSkipped && styles.thumbnailSkipped]}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.thumbnailImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}

                  {/* Title & Category */}
                  <View style={styles.exerciseDetails}>
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
                            <Text style={styles.customBadgeText}>ADDED</Text>
                          </View>
                        )}

                        {isSkipped && (
                          <View style={styles.skippedBadge}>
                            <Text style={styles.skippedBadgeText}>SKIPPED</Text>
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
                        <Text style={styles.previewHintText}>Preview</Text>
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

                    {/* Volume (Sets x Reps, Rest) */}
                    {!isSkipped && (
                      <View style={styles.volumeRow}>
                        <Text style={styles.volumeText}>
                          <Text style={styles.volumeAccent}>{item.targetSets} sets</Text> × {item.targetReps}
                        </Text>
                        <View style={styles.restBadge}>
                          <Clock size={9} color={COLORS.textMuted} />
                          <Text style={styles.restText}>{item.restPeriodSeconds}s rest</Text>
                        </View>
                      </View>
                    )}

                    {/* Coaching Cue Box */}
                    {!isSkipped && (
                      <View style={styles.cueBox}>
                        <Text style={styles.cueLabel}>CUE:</Text>
                        <Text style={styles.cueText}>{item.coachingCue}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

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
                          Restore Exercise
                        </Text>
                      </>
                    ) : (
                      <>
                        <SkipForward size={11} color={COLORS.textMuted} />
                        <Text style={styles.itemActionPillText}>Skip</Text>
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
                    <Text style={styles.itemActionPillText}>Swap</Text>
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
                        Remove
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
              + Add Skill / Exercise from RepDB
            </Text>
            <Text style={styles.addExerciseSubtitle}>
              Select from 643 movements (e.g. Pull-up, Squat, Dips)
            </Text>
          </View>
        </TouchableOpacity>

        {/* RepDB Dataset Attribution Footer */}
        <View style={styles.repDbAttributionRow}>
          <Database size={11} color={COLORS.textMuted} />
          <Text style={styles.repDbAttributionText}>
            Exercise dataset by <Text style={{ color: modeColors.accent }}>RepDB (repdb.co)</Text> • 643 Science-Backed Movements
          </Text>
        </View>

        {/* Ask Coach CTA */}
        <TouchableOpacity
          onPress={() => onAskCoach({ ...plan, exercises })}
          style={[styles.askCoachBtn, { backgroundColor: modeColors.accent }]}
          activeOpacity={0.85}
        >
          <Sparkles size={16} color={COLORS.textDark} />
          <Text style={styles.askCoachBtnText}>Ask Coach to Breakdown This Routine</Text>
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
        onClose={() => setSelectedExerciseForModal(null)}
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
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  volumeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textSecondary,
    flexShrink: 1,
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
});
