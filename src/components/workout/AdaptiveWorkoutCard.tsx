import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GeneratedWorkoutPlan, ExerciseItem } from '@/types/workout';
import { CoachingMode } from '@/types/coach';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
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
} from 'lucide-react-native';

interface AdaptiveWorkoutCardProps {
  plan: GeneratedWorkoutPlan;
  mode: CoachingMode;
  onAskCoach: (plan: GeneratedWorkoutPlan) => void;
}

export const AdaptiveWorkoutCard: React.FC<AdaptiveWorkoutCardProps> = ({
  plan,
  mode,
  onAskCoach,
}) => {
  const modeColors = getModeColors(mode);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});

  const toggleExercise = (id: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
    <GlassCard glowColor={`${tierColor}30`} borderColor={`${tierColor}40`} style={styles.card}>
      {/* Header Badge Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: `${modeColors.accent}20` }]}>
            <Dumbbell size={16} color={modeColors.accent} />
          </View>
          <View>
            <Text style={styles.planSuperTitle}>DATA-GENERATED EXERCISE PLAN</Text>
            <Text style={styles.planTitle}>{plan.title}</Text>
          </View>
        </View>

        <View style={[styles.tierBadge, { borderColor: tierColor }]}>
          <Zap size={11} color={tierColor} />
          <Text style={[styles.tierBadgeText, { color: tierColor }]}>{plan.tierLabel}</Text>
        </View>
      </View>

      {/* Meta Specs (Duration, Target Skill, Readiness note) */}
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Clock size={12} color={COLORS.textSecondary} />
          <Text style={styles.metaPillText}>~{plan.estimatedDurationMin} MIN</Text>
        </View>

        <View style={styles.metaPill}>
          <Activity size={12} color={modeColors.accent} />
          <Text style={[styles.metaPillText, { color: modeColors.accent }]}>
            {plan.exercises.length} MOVEMENTS
          </Text>
        </View>

        <View style={styles.metaPill}>
          <Text style={styles.metaPillDate}>{plan.generatedDate}</Text>
        </View>
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
          <Text style={styles.milestoneLabel}>TARGET SKILL:</Text>
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
        {plan.exercises.map((item, idx) => {
          const isDone = !!completedExercises[item.id];
          const catColor = getCategoryColor(item.category);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => toggleExercise(item.id)}
              style={[styles.exerciseItem, isDone && styles.exerciseItemDone]}
              activeOpacity={0.8}
            >
              <View style={styles.exerciseItemTop}>
                {/* Checkbox */}
                <View style={styles.checkboxWrapper}>
                  {isDone ? (
                    <CheckCircle2 size={18} color={COLORS.success} />
                  ) : (
                    <Circle size={18} color={COLORS.textMuted} />
                  )}
                </View>

                {/* Title & Category */}
                <View style={styles.exerciseDetails}>
                  <View style={styles.catBadgeRow}>
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
                    <Text style={styles.intensityTag}>{item.intensityNote}</Text>
                  </View>

                  <Text
                    style={[
                      styles.exerciseName,
                      isDone && styles.exerciseNameDone,
                    ]}
                  >
                    {item.name}
                  </Text>

                  {/* Volume (Sets x Reps, Rest) */}
                  <View style={styles.volumeRow}>
                    <Text style={styles.volumeText}>
                      <Text style={styles.volumeAccent}>{item.targetSets} sets</Text> × {item.targetReps}
                    </Text>
                    <Text style={styles.restText}>Rest: {item.restPeriodSeconds}s</Text>
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
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSuperTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  planTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  tierBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  metaPillText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  metaPillDate: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  guidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
    lineHeight: 16,
  },
  milestoneHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
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
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '700',
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
  exerciseDetails: {
    flex: 1,
    gap: 3,
  },
  catBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 1,
  },
  volumeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  volumeAccent: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  restText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
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
