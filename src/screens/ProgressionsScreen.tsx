import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useCoachStore } from '@/store/useCoachStore';
import { useChatStore } from '@/store/useChatStore';
import { useMemoryStore } from '@/store/useMemoryStore';
import { SkillLevel, TrainingGoal } from '@/types/coach';
import { CoreWorkoutDayType } from '@/types/workout';
import { generateAdaptiveWorkoutPlan } from '@/services/workout/workoutPlanGenerator';
import { AdaptiveWorkoutCard } from '@/components/workout/AdaptiveWorkoutCard';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import {
  useWorkoutStore,
  ALL_CYCLE_DAY_TYPES,
  addDaysToDateString,
} from '@/store/useWorkoutStore';
import { useTranslation } from '@/i18n';
import {
  DateNavigationBar,
  getTodayDateString,
  formatDateDisplay,
} from '@/components/common/DateNavigationBar';
import {
  Dumbbell,
  Activity,
  Flame,
  Zap,
  ShieldCheck,
  Sliders,
  Calendar,
  Moon,
  Plus,
  X,
  Settings,
  Target,
} from 'lucide-react-native';

interface ProgressionsScreenProps {
  onNavigateToChat: () => void;
}

const CYCLE_PILL_META: Record<
  CoreWorkoutDayType,
  { defaultLabel: string; icon: any; accentColor?: string }
> = {
  push: { defaultLabel: 'Push', icon: Zap },
  pull: { defaultLabel: 'Pull', icon: ShieldCheck },
  legs: { defaultLabel: 'Legs', icon: Flame },
  cardio: { defaultLabel: 'Cardio', icon: Activity },
  rest: { defaultLabel: 'Rest', icon: Moon, accentColor: COLORS.recoveryAccent },
};

const TRAINING_GOAL_IDS: TrainingGoal[] = [
  'strength_hypertrophy',
  'calisthenics_mastery',
  'fat_loss_recomp',
  'cardio_endurance',
  'daily_health_longevity',
];

const SKILL_LEVEL_IDS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

export const ProgressionsScreen: React.FC<ProgressionsScreenProps> = ({
  onNavigateToChat,
}) => {
  const { t, language } = useTranslation();
  const { userProfile, updateProfile, setSkillLevel } = useCoachStore();
  const equipmentMode: 'all' | 'bodyweight' =
    userProfile?.equipmentPreference === 'home' ? 'bodyweight' : 'all';
  const { calisthenicsStages, metrics } = useTelemetryStore();
  const { sendMessage } = useChatStore();
  const memories = useMemoryStore((state) => state.memories);
  const {
    selectedDate,
    setSelectedDate,
    historyByDate,
    plansByDate,
    activeCycle,
    scheduleOverridesByDate,
    cycleAnchorDate,
    cycleAnchorIndex,
    getScheduledCycleStepForDate,
    setActiveCycleStepForDate,
    appendCycleStep,
    removeCycleStepAt,
  } = useWorkoutStore();
  const modeColors = getModeColors();

  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  const todayStr = useMemo(() => getTodayDateString(), []);
  const activeDate = selectedDate || todayStr;
  const isPastDate = activeDate < todayStr;
  const completedSessionForDate = (historyByDate || {})[activeDate];

  const displayCycle = useMemo(() => {
    const filtered = (activeCycle || []).filter(
      (d) => d === 'push' || d === 'pull' || d === 'legs' || d === 'cardio'
    );
    return filtered.length > 0
      ? filtered
      : (['push', 'pull', 'legs', 'cardio'] as CoreWorkoutDayType[]);
  }, [activeCycle]);

  const handlePrevDay = () => {
    setSelectedDate(addDaysToDateString(activeDate, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDaysToDateString(activeDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  // Active goal & skill level
  const activeGoal: TrainingGoal = userProfile.primaryGoals?.[0] || 'strength_hypertrophy';
  const activeSkillLevel: SkillLevel = userProfile.skillLevel || 'intermediate';

  // Scheduled cycle step (both split and exact sequence index) for activeDate
  // Advances automatically only when a workout is completed!
  const currentStep = useMemo(() => {
    return getScheduledCycleStepForDate(activeDate);
  }, [
    activeDate,
    displayCycle,
    historyByDate,
    scheduleOverridesByDate,
    cycleAnchorDate,
    cycleAnchorIndex,
    getScheduledCycleStepForDate,
  ]);
  const currentSplit = currentStep.split;

  // Compute simplified 4-movement adaptive plan (with coach memory favorites prioritized)
  const adaptivePlan = useMemo(() => {
    return generateAdaptiveWorkoutPlan({
      goals: [activeGoal],
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
    metrics,
    userProfile,
    calisthenicsStages,
    equipmentMode,
    activeSkillLevel,
    currentSplit,
    memories,
  ]);

  // Read saved plan if user or AI Agent has explicitly customized/scheduled it for this date
  const effectivePlan = useMemo(() => {
    const savedPlan = (plansByDate || {})[activeDate];
    if (!savedPlan || !savedPlan.exercises || savedPlan.exercises.length === 0) {
      return adaptivePlan;
    }
    const planSplit = savedPlan.selectedSplit?.toLowerCase();
    const activeSplit = currentSplit?.toLowerCase();
    const isSplitMatch =
      planSplit === activeSplit ||
      planSplit === 'custom' ||
      planSplit === 'full_body' ||
      !planSplit;

    if (isSplitMatch) {
      return savedPlan;
    }
    return adaptivePlan;
  }, [plansByDate, activeDate, currentSplit, adaptivePlan]);

  const handleAskCoachPlan = () => {
    onNavigateToChat();
    const goalTitle = t.workout.goals[activeGoal] || activeGoal;
    const query = t.workout.askCoachPlanTemplate
      .replace('{title}', adaptivePlan.title)
      .replace('{tier}', adaptivePlan.tierLabel)
      .replace('{duration}', String(adaptivePlan.estimatedDurationMin))
      .replace('{goal}', goalTitle)
      .replace('{level}', activeSkillLevel.toUpperCase())
      .replace('{readiness}', String(metrics.readinessScore));
    sendMessage(query);
  };

  const compactEquipmentLabel =
    equipmentMode === 'bodyweight' ? t.workout.card.bodyweight : t.workout.card.allGym;
  const compactSkillLabel =
    activeSkillLevel === 'beginner'
      ? '🌱 Beg.'
      : activeSkillLevel === 'advanced'
      ? '🔥 Adv.'
      : '⚡ Inter.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header + Compact Workout Settings Pill */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Dumbbell size={20} color={modeColors.accent} />
                <Text style={styles.title}>{t.workout.screenTitle}</Text>
              </View>
              <Text style={styles.subtitle}>{t.workout.screenSubtitle}</Text>
            </View>

            {/* Sleek 1-Line Workout Settings Summary Pill */}
            <TouchableOpacity
              onPress={() => setIsSettingsModalVisible(true)}
              style={[
                styles.headerSettingsPill,
                {
                  borderColor: `${modeColors.accent}45`,
                  backgroundColor: `${modeColors.accent}12`,
                },
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Workout settings: ${compactEquipmentLabel}, ${compactSkillLabel}. Tap to configure.`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.headerSettingsPillText} numberOfLines={1}>
                {compactEquipmentLabel} • {compactSkillLabel}
              </Text>
              <Settings size={13} color={modeColors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Navigation Bar (supports past, today, and future scheduling) */}
        <DateNavigationBar
          currentDate={activeDate}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
          accentColor={modeColors.accent}
          allowFutureDates={true}
          style={styles.dateNavBar}
        />

        {/* ========================================================== */}
        {/* DYNAMIC WORKOUT SEQUENCE BAR (e.g. 1. PUSH → 2. PULL → 3. LEGS) */}
        {/* ========================================================== */}
        <View style={styles.cycleSection}>
          <View style={styles.selectorHeaderRow}>
            <View style={styles.selectorTitleRow}>
              <Calendar size={13} color={modeColors.accent} />
              <Text style={styles.selectorGroupTitle}>{t.workout.cycleSection}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsSettingsModalVisible(true)}
              style={styles.editCycleToggleBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Edit cycle split configuration"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Sliders size={11} color={COLORS.textSecondary} />
              <Text style={styles.editCycleToggleText}>{t.workout.editCycleBtn}</Text>
            </TouchableOpacity>
          </View>

          {/* Ordered Sequence Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.cyclePillScroll}
            contentContainerStyle={styles.cyclePillContent}
          >
            {displayCycle.map((dayType, idx) => {
              const meta = CYCLE_PILL_META[dayType] || CYCLE_PILL_META.push;
              const IconComp = meta.icon;
              const label = (t.workout.splits as any)[dayType] || meta.defaultLabel;
              const isSelectedToday = !currentStep.isOverride
                ? currentStep.cycleIndex === idx
                : currentSplit === dayType && displayCycle.indexOf(dayType) === idx;
              const pillAccent = meta.accentColor || modeColors.accent;

              return (
                <React.Fragment key={`${dayType}-${idx}`}>
                  <TouchableOpacity
                    onPress={() => setActiveCycleStepForDate(activeDate, idx)}
                    activeOpacity={0.8}
                    style={[
                      styles.cyclePill,
                      isSelectedToday && {
                        borderColor: pillAccent,
                        backgroundColor: `${pillAccent}25`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cycleStepNumText,
                        isSelectedToday && { color: pillAccent },
                      ]}
                    >
                      {idx + 1}.
                    </Text>
                    <IconComp
                      size={12}
                      color={isSelectedToday ? pillAccent : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.cyclePillText,
                        isSelectedToday && {
                          color: pillAccent,
                          fontWeight: '800',
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                  {idx < displayCycle.length - 1 && (
                    <Text style={styles.sequenceArrowText}>→</Text>
                  )}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>

        {/* Automatic Rest Day Banner on past dates with no logged workout */}
        {isPastDate && !completedSessionForDate && (
          <View style={styles.upNextBox}>
            <Moon size={14} color={COLORS.recoveryAccent} />
            <Text style={styles.upNextText}>
              {t.workout.noWorkoutOnDate.replace('{date}', formatDateDisplay(activeDate, language, t))}
            </Text>
          </View>
        )}

        {/* Simplified 4-Movement Adaptive Workout Card (Live Auto-Logs on Check) */}
        <AdaptiveWorkoutCard
          key={`${activeDate}-${currentSplit}-${effectivePlan.id}`}
          plan={effectivePlan}
          date={activeDate}
          onAskCoach={() => handleAskCoachPlan()}
        />
      </ScrollView>

      {/* ========================================================== */}
      {/* UNIFIED WORKOUT SETTINGS MODAL (CYCLE, EQUIPMENT, LEVEL, GOAL) */}
      {/* ========================================================== */}
      <Modal
        visible={isSettingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard
            glowColor={`${modeColors.accent}30`}
            borderColor={`${modeColors.accent}45`}
            style={styles.modalCard}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconCircle,
                    { backgroundColor: `${modeColors.accent}20` },
                  ]}
                >
                  <Sliders size={16} color={modeColors.accent} />
                </View>
                <View>
                  <Text style={styles.modalSuperTitle}>WORKOUT PREFERENCES</Text>
                  <Text style={styles.modalTitle}>Customize Cycle & Training</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsSettingsModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.75}
              >
                <X size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* 1. Workout Sequence Builder */}
              <View style={styles.modalSection}>
                <View style={styles.selectorTitleRow}>
                  <Calendar size={13} color={modeColors.accent} />
                  <Text style={styles.modalSectionTitle}>{t.workout.cycleSection}</Text>
                </View>
                <Text style={styles.modalSectionHint}>
                  Tap any step in your sequence to remove it, or tap + buttons below to append splits in any order. Any day without a logged workout is automatically a Rest Day.
                </Text>

                {/* Active Sequence Pills with Remove (×) */}
                <View style={styles.modalSequenceWrap}>
                  {displayCycle.map((dayType, idx) => {
                    const meta = CYCLE_PILL_META[dayType] || CYCLE_PILL_META.push;
                    const IconComp = meta.icon;
                    const label = (t.workout.splits as any)[dayType] || meta.defaultLabel;
                    const pillAccent = meta.accentColor || modeColors.accent;
                    return (
                      <React.Fragment key={`modal-seq-${dayType}-${idx}`}>
                        <TouchableOpacity
                          onPress={() => {
                            if (displayCycle.length > 1) {
                              removeCycleStepAt(idx);
                            }
                          }}
                          activeOpacity={0.8}
                          style={[
                            styles.cyclePill,
                            {
                              borderColor: `${pillAccent}55`,
                              backgroundColor: `${pillAccent}16`,
                            },
                          ]}
                        >
                          <Text style={[styles.cycleStepNumText, { color: pillAccent }]}>
                            {idx + 1}.
                          </Text>
                          <IconComp size={12} color={pillAccent} />
                          <Text
                            style={[
                              styles.cyclePillText,
                              { color: pillAccent, fontWeight: '700' },
                            ]}
                          >
                            {label}
                          </Text>
                          {displayCycle.length > 1 && (
                            <View
                              style={[
                                styles.cycleEditBadge,
                                { backgroundColor: 'rgba(239, 68, 68, 0.22)' },
                              ]}
                            >
                              <X size={9} color={COLORS.danger} />
                            </View>
                          )}
                        </TouchableOpacity>
                        {idx < displayCycle.length - 1 && (
                          <Text style={styles.sequenceArrowText}>→</Text>
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>

                {/* + Append Split Buttons */}
                <View style={[styles.modalSequenceWrap, { marginTop: 6 }]}>
                  {ALL_CYCLE_DAY_TYPES.map((dayType) => {
                    const meta = CYCLE_PILL_META[dayType];
                    const IconComp = meta.icon;
                    const label = (t.workout.splits as any)[dayType] || meta.defaultLabel;
                    const pillAccent = meta.accentColor || modeColors.accent;
                    return (
                      <TouchableOpacity
                        key={`modal-add-${dayType}`}
                        onPress={() => appendCycleStep(dayType)}
                        activeOpacity={0.8}
                        style={[
                          styles.addStepPill,
                          {
                            borderColor: `${pillAccent}55`,
                            backgroundColor: `${pillAccent}14`,
                          },
                        ]}
                      >
                        <Plus size={11} color={pillAccent} />
                        <IconComp size={11} color={pillAccent} />
                        <Text style={[styles.addStepPillText, { color: pillAccent }]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. Training Environment (Full Gym vs Bodyweight) */}
              <View style={styles.modalSection}>
                <View style={styles.selectorTitleRow}>
                  <Dumbbell size={13} color={modeColors.accent} />
                  <Text style={styles.modalSectionTitle}>{t.settings.defaultEnvironment}</Text>
                </View>
                <View style={styles.modalPillRow}>
                  {(
                    [
                      { id: 'both', label: t.onboarding.fullGym, icon: Dumbbell },
                      { id: 'home', label: t.onboarding.homeEquipment, icon: Activity },
                    ] as const
                  ).map((eq) => {
                    const isSelected =
                      eq.id === 'home'
                        ? equipmentMode === 'bodyweight'
                        : equipmentMode === 'all';
                    const IconComp = eq.icon;
                    return (
                      <TouchableOpacity
                        key={eq.id}
                        onPress={() =>
                          updateProfile({
                            equipmentPreference: eq.id === 'home' ? 'home' : 'both',
                          })
                        }
                        style={[
                          styles.modalOptionBtn,
                          isSelected && {
                            borderColor: modeColors.accent,
                            backgroundColor: `${modeColors.accent}20`,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <IconComp
                          size={13}
                          color={isSelected ? modeColors.accent : COLORS.textSecondary}
                        />
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected && { color: modeColors.accent, fontWeight: '700' },
                          ]}
                        >
                          {eq.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. Athlete Skill Level */}
              <View style={styles.modalSection}>
                <View style={styles.selectorTitleRow}>
                  <Zap size={13} color={modeColors.accent} />
                  <Text style={styles.modalSectionTitle}>{t.workout.skillLevelSection}</Text>
                </View>
                <View style={styles.modalPillRow}>
                  {SKILL_LEVEL_IDS.map((lvl) => {
                    const isSelected = activeSkillLevel === lvl;
                    const label = (t.workout.skillLevels as any)[lvl] || lvl.toUpperCase();
                    return (
                      <TouchableOpacity
                        key={lvl}
                        onPress={() => setSkillLevel(lvl)}
                        style={[
                          styles.modalOptionBtn,
                          isSelected && {
                            borderColor: modeColors.accent,
                            backgroundColor: `${modeColors.accent}20`,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected && { color: modeColors.accent, fontWeight: '700' },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Primary Training Goal */}
              <View style={styles.modalSection}>
                <View style={styles.selectorTitleRow}>
                  <Target size={13} color={modeColors.accent} />
                  <Text style={styles.modalSectionTitle}>{t.workout.trainingGoalSection}</Text>
                </View>
                <View style={styles.modalGoalWrap}>
                  {TRAINING_GOAL_IDS.map((goalId) => {
                    const isSelected = activeGoal === goalId;
                    const label = (t.workout.goals as any)[goalId] || goalId;
                    return (
                      <TouchableOpacity
                        key={goalId}
                        onPress={() => {
                          const existing = userProfile.primaryGoals || [];
                          updateProfile({
                            primaryGoals: [goalId, ...existing.filter((g) => g !== goalId)],
                          });
                        }}
                        style={[
                          styles.modalGoalPill,
                          isSelected && {
                            borderColor: modeColors.accent,
                            backgroundColor: `${modeColors.accent}20`,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected && { color: modeColors.accent, fontWeight: '700' },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Done CTA */}
            <TouchableOpacity
              onPress={() => setIsSettingsModalVisible(false)}
              style={[styles.modalDoneBtn, { backgroundColor: modeColors.accent }]}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneBtnText}>{t.workout.doneCycleBtn}</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  headerSettingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    minHeight: 34,
  },
  headerSettingsPillText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11.5,
    color: COLORS.textPrimary,
  },
  dateNavBar: {
    marginBottom: SPACING.md,
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
    fontSize: 12,
  },

  // Dynamic Workout Sequence Bar
  cycleSection: {
    marginBottom: SPACING.md,
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
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  editCycleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    minHeight: 28,
  },
  editCycleToggleText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  cyclePillScroll: {
    marginHorizontal: -SPACING.lg,
  },
  cyclePillContent: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  cyclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  cyclePillText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cycleEditBadge: {
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  cycleStepNumText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '800',
  },
  sequenceArrowText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.textMuted,
    marginHorizontal: -2,
  },
  addStepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addStepPillText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    fontWeight: '700',
  },
  upNextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  upNextText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: '#E0F2FE',
  },

  // Unified Workout Settings Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    maxHeight: '86%',
    gap: SPACING.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSuperTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 8.5,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  modalTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  modalSection: {
    gap: 6,
  },
  modalSectionTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  modalSectionHint: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  modalSequenceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modalOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalOptionText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  modalGoalWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalGoalPill: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalDoneBtn: {
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  modalDoneBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textDark,
  },
});
