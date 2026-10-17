import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useCoachStore } from '@/store/useCoachStore';
import { useChatStore } from '@/store/useChatStore';
import { SkillLevel, TrainingGoal } from '@/types/coach';
import { WorkoutSplit } from '@/types/workout';
import {
  generateAdaptiveWorkoutPlan,
  getCoachSplitRecommendation,
} from '@/services/workout/workoutPlanGenerator';
import { AdaptiveWorkoutCard } from '@/components/workout/AdaptiveWorkoutCard';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { HorizontalChipBar, ChipItem } from '@/components/common/HorizontalChipBar';
import { GlassCard } from '@/components/common/GlassCard';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  DateNavigationBar,
  getTodayDateString,
  formatDateDisplay,
} from '@/components/common/DateNavigationBar';
import {
  Dumbbell,
  Activity,
  Sparkles,
  Flame,
  Zap,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Sliders,
  Target,
  Calendar,
} from 'lucide-react-native';

interface ProgressionsScreenProps {
  onNavigateToChat: () => void;
}

const TRAINING_GOALS: Array<{ id: TrainingGoal; label: string; icon: any }> = [
  { id: 'strength_hypertrophy', label: 'Strength & Hypertrophy', icon: Dumbbell },
  { id: 'calisthenics_mastery', label: 'Calisthenics Skills', icon: Zap },
  { id: 'fat_loss_recomp', label: 'Fat Loss & Recomp', icon: Flame },
  { id: 'cardio_endurance', label: 'Cardio & Aerobic', icon: Activity },
  { id: 'daily_health_longevity', label: 'Health & Longevity', icon: ShieldCheck },
];

const SKILL_LEVELS: Array<{ id: SkillLevel; label: string; subLabel: string }> = [
  { id: 'beginner', label: '🌱 Beginner', subLabel: 'Form & Base' },
  { id: 'intermediate', label: '⚡ Intermediate', subLabel: 'Progression' },
  { id: 'advanced', label: '🔥 Advanced', subLabel: 'Peak Overload' },
];

const WORKOUT_SPLITS: Array<{ id: WorkoutSplit; label: string; icon: any }> = [
  { id: 'full_body', label: 'Full Body', icon: Dumbbell },
  { id: 'push', label: 'Push', icon: Zap },
  { id: 'pull', label: 'Pull', icon: ShieldCheck },
  { id: 'legs', label: 'Legs', icon: Flame },
  { id: 'upper', label: 'Upper', icon: Dumbbell },
  { id: 'lower', label: 'Lower', icon: Activity },
  { id: 'core_mobility', label: 'Core & Mobility', icon: ShieldCheck },
  { id: 'calisthenics_skills', label: 'Calisthenics Skills', icon: Zap },
  { id: 'cardio_engine', label: 'Cardio Engine', icon: Activity },
];

export const ProgressionsScreen: React.FC<ProgressionsScreenProps> = ({
  onNavigateToChat,
}) => {
  const { mode, userProfile, updateProfile, setSkillLevel } = useCoachStore();
  const defaultMode = userProfile.equipmentPreference === 'home' ? 'bodyweight' : 'all';
  const [equipmentMode, setEquipmentMode] = useState<'all' | 'bodyweight'>(defaultMode);
  const { calisthenicsStages, metrics } = useTelemetryStore();
  const { sendMessage } = useChatStore();
  const { selectedDate, setSelectedDate, historyByDate } = useWorkoutStore();
  const modeColors = getModeColors(mode);

  const todayStr = useMemo(() => getTodayDateString(), []);
  const activeDate = selectedDate || todayStr;
  const isToday = activeDate === todayStr;
  const completedSessionForDate = historyByDate[activeDate];

  const handlePrevDay = () => {
    const [year, month, day] = activeDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const prevStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    setSelectedDate(prevStr);
  };

  const handleNextDay = () => {
    if (activeDate >= todayStr) return; // Prevent navigating into future dates
    const [year, month, day] = activeDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  // Active goal (from profile or fallback)
  const activeGoal: TrainingGoal = userProfile.primaryGoals?.[0] || 'strength_hypertrophy';
  const activeSkillLevel: SkillLevel = userProfile.skillLevel || 'intermediate';

  // Selected Split state (null means follow Coach's recommendation)
  const [selectedSplit, setSelectedSplit] = useState<WorkoutSplit | null>(null);

  // Compute coach recommendation
  const coachRec = useMemo(() => {
    return getCoachSplitRecommendation({
      goals: [activeGoal],
      mode,
      readinessScore: metrics.readinessScore,
      weightKg: userProfile.weightKg,
      heightCm: userProfile.heightCm,
      activeStages: calisthenicsStages,
      activeCalories: metrics.activeCalories,
      equipmentMode,
      sex: userProfile.sex,
      skillLevel: activeSkillLevel,
    });
  }, [activeGoal, mode, metrics, userProfile, calisthenicsStages, equipmentMode, activeSkillLevel]);

  // Current active split
  const currentSplit = selectedSplit || coachRec.recommendedSplit;
  const isUsingCoachRec = !selectedSplit || selectedSplit === coachRec.recommendedSplit;

  // Compute adaptive exercise plan dynamically generated by the user's data, goal, skill level, and RepDB
  const adaptivePlan = useMemo(() => {
    return generateAdaptiveWorkoutPlan({
      goals: [activeGoal],
      mode,
      readinessScore: metrics.readinessScore,
      weightKg: userProfile.weightKg,
      heightCm: userProfile.heightCm,
      activeStages: calisthenicsStages,
      activeCalories: metrics.activeCalories,
      equipmentMode,
      sex: userProfile.sex,
      skillLevel: activeSkillLevel,
      selectedSplit: currentSplit,
    });
  }, [
    activeGoal,
    mode,
    metrics,
    userProfile,
    calisthenicsStages,
    equipmentMode,
    activeSkillLevel,
    currentSplit,
  ]);

  // Handle switching goal
  const handleSelectGoal = (goal: TrainingGoal) => {
    const existing = userProfile.primaryGoals || [];
    const updated = [goal, ...existing.filter((g) => g !== goal)];
    updateProfile({ primaryGoals: updated });
    // Reset selected split so coach re-evaluates
    setSelectedSplit(null);
  };

  // Handle switching skill level
  const handleSelectSkillLevel = (level: SkillLevel) => {
    setSkillLevel(level);
  };

  // Goal chip items
  const goalChipItems: ChipItem[] = useMemo(() => {
    return TRAINING_GOALS.map((g) => ({
      id: g.id,
      label: g.label,
      icon: g.icon,
    }));
  }, []);

  // Split chip items
  const splitChipItems: ChipItem[] = useMemo(() => {
    return WORKOUT_SPLITS.map((s) => ({
      id: s.id,
      label: s.label,
      icon: s.icon,
      badge: s.id === coachRec.recommendedSplit ? '⚡ Coach' : undefined,
    }));
  }, [coachRec.recommendedSplit]);

  const handleAskCoachPlan = () => {
    onNavigateToChat();
    const goalTitle = TRAINING_GOALS.find((g) => g.id === activeGoal)?.label || activeGoal;
    sendMessage(
      `Coach, I am reviewing today's suggested plan: "${adaptivePlan.title}" (${adaptivePlan.tierLabel}, ~${adaptivePlan.estimatedDurationMin} min). My goal is ${goalTitle} at ${activeSkillLevel.toUpperCase()} level with a Readiness Score of ${metrics.readinessScore}/100. Why is this workout split and progression scheme best for me today?`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Dumbbell size={20} color={modeColors.accent} />
            <Text style={styles.title}>ADAPTIVE WORKOUT</Text>
          </View>
          <Text style={styles.subtitle}>
            Goal-Driven Training • RepDB Open Exercise Library
          </Text>
        </View>

        {/* Date Navigation Bar (parity with Nutrition) */}
        <DateNavigationBar
          currentDate={activeDate}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
          accentColor={modeColors.accent}
          style={styles.dateNavBar}
        />

        {/* Contextual Notice for Past Dates */}
        {!isToday && (
          completedSessionForDate ? (
            <View style={styles.pastDateBanner}>
              <CheckCircle2 size={14} color={COLORS.success} />
              <Text style={styles.pastDateBannerText}>
                Workout Completed on {formatDateDisplay(activeDate)} ({activeDate})
              </Text>
            </View>
          ) : (
            <View style={styles.pastDateBannerMuted}>
              <Calendar size={14} color={COLORS.textMuted} />
              <Text style={styles.pastDateBannerTextMuted}>
                No workout recorded on {formatDateDisplay(activeDate)}. Showing scheduled plan:
              </Text>
            </View>
          )
        )}

        {/* ========================================================== */}
        {/* CONTROLS: GOAL, SKILL LEVEL, WORKOUT PLAN SELECTORS       */}
        {/* ========================================================== */}

        {/* 1. Primary Training Goal Selector */}
        <View style={styles.selectorGroup}>
          <View style={styles.selectorHeaderRow}>
            <View style={styles.selectorTitleRow}>
              <Target size={13} color={modeColors.accent} />
              <Text style={styles.selectorGroupTitle}>TRAINING GOAL</Text>
            </View>
            <Text style={styles.selectorActiveText}>
              {TRAINING_GOALS.find((g) => g.id === activeGoal)?.label}
            </Text>
          </View>
          <HorizontalChipBar
            items={goalChipItems}
            selectedId={activeGoal}
            onSelect={(item) => handleSelectGoal(item.id as TrainingGoal)}
            style={styles.selectorChipScroll}
            contentContainerStyle={styles.selectorChipContent}
          />
        </View>

        {/* 2. Athlete Skill Level Segmented Control */}
        <View style={styles.selectorGroup}>
          <View style={styles.selectorHeaderRow}>
            <View style={styles.selectorTitleRow}>
              <Sliders size={13} color={modeColors.accent} />
              <Text style={styles.selectorGroupTitle}>SKILL LEVEL</Text>
            </View>
            <Text style={[styles.selectorActiveText, { color: modeColors.accent }]}>
              {activeSkillLevel.toUpperCase()}
            </Text>
          </View>
          <View style={styles.skillSegmentContainer}>
            {SKILL_LEVELS.map((level) => {
              const isSelected = activeSkillLevel === level.id;
              return (
                <TouchableOpacity
                  key={level.id}
                  onPress={() => handleSelectSkillLevel(level.id)}
                  style={[
                    styles.skillSegmentOption,
                    isSelected && {
                      borderColor: modeColors.accent,
                      backgroundColor: `${modeColors.accent}20`,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.skillSegmentText,
                      isSelected && { color: modeColors.accent, fontWeight: '700' },
                    ]}
                  >
                    {level.label}
                  </Text>
                  <Text
                    style={[
                      styles.skillSegmentSubText,
                      isSelected && { color: modeColors.accent, opacity: 0.9 },
                    ]}
                  >
                    {level.subLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Workout Plan / Split Selector */}
        <View style={styles.selectorGroup}>
          <View style={styles.selectorHeaderRow}>
            <View style={styles.selectorTitleRow}>
              <Zap size={13} color={modeColors.accent} />
              <Text style={styles.selectorGroupTitle}>WORKOUT PLAN / SPLIT</Text>
            </View>
            <Text style={styles.selectorActiveText}>
              {WORKOUT_SPLITS.find((s) => s.id === currentSplit)?.label}
            </Text>
          </View>
          <HorizontalChipBar
            items={splitChipItems}
            selectedId={currentSplit}
            onSelect={(item) => setSelectedSplit(item.id as WorkoutSplit)}
            style={styles.selectorChipScroll}
            contentContainerStyle={styles.selectorChipContent}
          />
        </View>

        {/* ========================================================== */}
        {/* COACH RECOMMENDATION BANNER                                */}
        {/* ========================================================== */}
        <GlassCard
          glowColor={`${modeColors.accent}25`}
          borderColor={`${modeColors.accent}40`}
          style={styles.coachRecCard}
        >
          <View style={styles.coachRecTopRow}>
            <View style={styles.coachRecTitleBox}>
              <View style={[styles.coachRecIconBadge, { backgroundColor: `${modeColors.accent}20` }]}>
                <Sparkles size={14} color={modeColors.accent} />
              </View>
              <View>
                <Text style={styles.coachRecLabel}>COACH SUGGESTION</Text>
                <Text style={styles.coachRecSplitTitle}>{coachRec.splitTitle}</Text>
              </View>
            </View>
            <View style={[styles.coachRecBadge, { borderColor: `${modeColors.accent}50`, backgroundColor: `${modeColors.accent}15` }]}>
              <Text style={[styles.coachRecBadgeText, { color: modeColors.accent }]}>
                {coachRec.badge}
              </Text>
            </View>
          </View>

          <Text style={styles.coachRecReasoning}>{coachRec.reasoning}</Text>

          {/* Action Row */}
          <View style={styles.coachRecActionsRow}>
            {!isUsingCoachRec ? (
              <TouchableOpacity
                onPress={() => setSelectedSplit(coachRec.recommendedSplit)}
                style={[styles.applyCoachBtn, { backgroundColor: modeColors.accent }]}
                activeOpacity={0.8}
              >
                <Zap size={13} color={COLORS.background} />
                <Text style={styles.applyCoachBtnText}>
                  Apply Coach Plan ({coachRec.splitTitle})
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.activeCoachBadge, { borderColor: `${COLORS.success}60`, backgroundColor: `${COLORS.success}15` }]}>
                <CheckCircle2 size={13} color={COLORS.success} />
                <Text style={[styles.activeCoachBadgeText, { color: COLORS.success }]}>
                  Active Coach Pick
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleAskCoachPlan}
              style={[styles.askCoachPlanBtn, { borderColor: `${modeColors.accent}40` }]}
              activeOpacity={0.8}
            >
              <MessageSquare size={13} color={modeColors.accent} />
              <Text style={[styles.askCoachPlanBtnText, { color: modeColors.accent }]}>
                Ask Coach
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Equipment Mode Segmented Selector */}
        <View style={styles.equipmentToggleContainer}>
          <TouchableOpacity
            onPress={() => setEquipmentMode('all')}
            style={[
              styles.equipmentOption,
              equipmentMode === 'all' && {
                borderColor: modeColors.accent,
                backgroundColor: `${modeColors.accent}20`,
              },
            ]}
            activeOpacity={0.8}
          >
            <Dumbbell
              size={14}
              color={equipmentMode === 'all' ? modeColors.accent : COLORS.textMuted}
            />
            <Text
              style={[
                styles.equipmentOptionText,
                equipmentMode === 'all' && { color: modeColors.accent, fontWeight: '700' },
              ]}
            >
              Full Gym (All Equipment)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setEquipmentMode('bodyweight')}
            style={[
              styles.equipmentOption,
              equipmentMode === 'bodyweight' && {
                borderColor: modeColors.accent,
                backgroundColor: `${modeColors.accent}20`,
              },
            ]}
            activeOpacity={0.8}
          >
            <Activity
              size={14}
              color={equipmentMode === 'bodyweight' ? modeColors.accent : COLORS.textMuted}
            />
            <Text
              style={[
                styles.equipmentOptionText,
                equipmentMode === 'bodyweight' && { color: modeColors.accent, fontWeight: '700' },
              ]}
            >
              Bodyweight / Home
            </Text>
          </TouchableOpacity>
        </View>

        {/* Adaptive Exercise Plan Generated by Goal, Skill Level, Split & RepDB */}
        <AdaptiveWorkoutCard
          key={activeDate}
          plan={adaptivePlan}
          mode={mode}
          date={activeDate}
          onAskCoach={() => handleAskCoachPlan()}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + 40,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  dateNavBar: {
    marginBottom: SPACING.md,
  },
  pastDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  pastDateBannerText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.success,
  },
  pastDateBannerMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  pastDateBannerTextMuted: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Selector Groups (Goal, Skill Level, Workout Plan)
  selectorGroup: {
    marginBottom: SPACING.sm + 4,
    gap: 6,
  },
  selectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  selectorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  selectorGroupTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9.5,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  selectorActiveText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  selectorChipScroll: {
    marginHorizontal: -SPACING.lg,
    height: 36,
  },
  selectorChipContent: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: 6,
    height: 36,
  },

  // Skill Level Segmented Control
  skillSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 4,
  },
  skillSegmentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  skillSegmentText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  skillSegmentSubText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // Coach Recommendation Banner
  coachRecCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    gap: 8,
  },
  coachRecTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coachRecTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachRecIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachRecLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 8.5,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  coachRecSplitTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  coachRecBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  coachRecBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    fontWeight: '800',
  },
  coachRecReasoning: {
    ...TYPOGRAPHY.caption,
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  coachRecActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  applyCoachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
  },
  applyCoachBtnText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.background,
  },
  activeCoachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  activeCoachBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
  },
  askCoachPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  askCoachPlanBtnText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
  },

  // Equipment Mode Segmented Selector
  equipmentToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.md,
    gap: 4,
  },
  equipmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  equipmentOptionText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
