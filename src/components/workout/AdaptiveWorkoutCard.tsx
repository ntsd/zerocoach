import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { GeneratedWorkoutPlan, ExerciseItem } from '@/types/workout';
import { CoachingMode } from '@/types/coach';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { ExerciseDetailModal } from './ExerciseDetailModal';
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
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<ExerciseItem | null>(null);

  const toggleExercise = (id: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleAskCoachForExercise = (exerciseName: string) => {
    onAskCoach({
      ...plan,
      coachingNotes: `Coach, guide me through optimal biomechanics, kinetic alignment, and set/rep execution for "${exerciseName}" based on my readiness.`,
    });
  };

  const completedCount = plan.exercises.filter((ex) => completedExercises[ex.id]).length;
  const totalCount = plan.exercises.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
            {plan.exercises.length} MOVEMENTS
          </Text>
        </View>

        <View style={styles.metaPill}>
          <Text style={styles.metaPillDate}>
            {plan.equipmentMode === 'bodyweight' ? 'HOME / BODYWEIGHT' : 'ALL GYM'}
          </Text>
        </View>

        {plan.skillLevel && (
          <View style={[styles.metaPill, { borderColor: `${modeColors.accent}50`, backgroundColor: `${modeColors.accent}15` }]}>
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
            {completedCount} of {totalCount} ({progressPercent}%)
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
        {plan.exercises.map((item) => {
          const isDone = !!completedExercises[item.id];
          const catColor = getCategoryColor(item.category);
          const firstMuscle = item.primaryMuscles?.[0];

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedExerciseForModal(item)}
              style={[styles.exerciseItem, isDone && styles.exerciseItemDone]}
              activeOpacity={0.75}
            >
              <View style={styles.exerciseItemTop}>
                {/* Checkbox (independent touch target) */}
                <TouchableOpacity
                  style={styles.checkboxWrapper}
                  onPress={() => toggleExercise(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  {isDone ? (
                    <CheckCircle2 size={18} color={COLORS.success} />
                  ) : (
                    <Circle size={18} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>

                {/* Thumbnail Image from RepDB */}
                {item.imageUrl ? (
                  <View style={styles.thumbnailWrapper}>
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
                      <Text style={styles.intensityTag} numberOfLines={1}>
                        {item.intensityNote}
                      </Text>
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
                    ]}
                  >
                    {item.name}
                  </Text>

                  {/* RepDB Biomechanical Specs Row */}
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

                  {/* Volume (Sets x Reps, Rest) */}
                  <View style={styles.volumeRow}>
                    <Text style={styles.volumeText}>
                      <Text style={styles.volumeAccent}>{item.targetSets} sets</Text> × {item.targetReps}
                    </Text>
                    <View style={styles.restBadge}>
                      <Clock size={9} color={COLORS.textMuted} />
                      <Text style={styles.restText}>{item.restPeriodSeconds}s rest</Text>
                    </View>
                  </View>

                  {/* Coaching Cue Box */}
                  <View style={styles.cueBox}>
                    <Text style={styles.cueLabel}>CUE:</Text>
                    <Text style={styles.cueText}>{item.coachingCue}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* RepDB Dataset Attribution Footer */}
      <View style={styles.repDbAttributionRow}>
        <Database size={11} color={COLORS.textMuted} />
        <Text style={styles.repDbAttributionText}>
          Exercise dataset by <Text style={{ color: modeColors.accent }}>RepDB (repdb.co)</Text> • 643 Science-Backed Movements
        </Text>
      </View>

      {/* Ask Coach CTA */}
      <TouchableOpacity
        onPress={() => onAskCoach(plan)}
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
  },
  exerciseItemDone: {
    opacity: 0.6,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
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
    gap: 6,
    flex: 1,
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
