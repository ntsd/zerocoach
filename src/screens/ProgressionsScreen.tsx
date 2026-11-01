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
  Sparkles,
  Flame,
  Zap,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Sliders,
  Calendar,
  Moon,
  SkipForward,
  FastForward,
  Plus,
  X,
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
  rest: { defaultLabel: 'Rest', icon: Moon, accentColor: '#38BDF8' },
};

export const ProgressionsScreen: React.FC<ProgressionsScreenProps> = ({
  onNavigateToChat,
}) => {
  const { t } = useTranslation();
  const { userProfile } = useCoachStore();
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

  const [isEditingCycle, setIsEditingCycle] = useState(false);

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

  // Active goal & skill level (configured in Settings -> Athlete Profile)
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

  // Compute simplified 4-movement adaptive plan (with Mem0 favorites prioritized)
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
    if (
      savedPlan &&
      savedPlan.selectedSplit === currentSplit &&
      savedPlan.exercises &&
      savedPlan.exercises.length > 0
    ) {
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
            <Text style={styles.title}>{t.workout.screenTitle}</Text>
          </View>
          <Text style={styles.subtitle}>{t.workout.screenSubtitle}</Text>
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
        {/* DYNAMIC WORKOUT SEQUENCE BAR (e.g. PULL → REST → REST → PUSH → REST) */}
        {/* ========================================================== */}
        <View style={styles.cycleSection}>
          <View style={styles.selectorHeaderRow}>
            <View style={styles.selectorTitleRow}>
              <Calendar size={13} color={modeColors.accent} />
              <Text style={styles.selectorGroupTitle}>{t.workout.cycleSection}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditingCycle((prev) => !prev)}
              style={[
                styles.editCycleToggleBtn,
                isEditingCycle && {
                  borderColor: modeColors.accent,
                  backgroundColor: `${modeColors.accent}20`,
                },
              ]}
              activeOpacity={0.75}
            >
              <Sliders
                size={11}
                color={isEditingCycle ? modeColors.accent : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.editCycleToggleText,
                  isEditingCycle && { color: modeColors.accent, fontWeight: '700' },
                ]}
              >
                {isEditingCycle ? t.workout.doneCycleBtn : t.workout.editCycleBtn}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingCycle && (
            <Text style={styles.editCycleHint}>
              Tap any step below to remove it, or tap + buttons to append steps in any order. Any day you don&apos;t log a workout is automatically a Rest Day.
            </Text>
          )}

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
              const isSelectedToday =
                !isEditingCycle &&
                (!currentStep.isOverride
                  ? currentStep.cycleIndex === idx
                  : currentSplit === dayType && displayCycle.indexOf(dayType) === idx);
              const pillAccent = meta.accentColor || modeColors.accent;

              return (
                <React.Fragment key={`${dayType}-${idx}`}>
                  <TouchableOpacity
                    onPress={() => {
                      if (isEditingCycle) {
                        if (displayCycle.length > 1) {
                          removeCycleStepAt(idx);
                        }
                      } else {
                        setActiveCycleStepForDate(activeDate, idx);
                      }
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.cyclePill,
                      isEditingCycle && {
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      },
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
                    {isEditingCycle && displayCycle.length > 1 && (
                      <View
                        style={[
                          styles.cycleEditBadge,
                          { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
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
          </ScrollView>

          {/* "+ Add Step" Palette when editing sequence */}
          {isEditingCycle && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cyclePillScroll}
              contentContainerStyle={[styles.cyclePillContent, { marginTop: 4 }]}
            >
              {ALL_CYCLE_DAY_TYPES.map((dayType) => {
                const meta = CYCLE_PILL_META[dayType];
                const IconComp = meta.icon;
                const label = (t.workout.splits as any)[dayType] || meta.defaultLabel;
                const pillAccent = meta.accentColor || modeColors.accent;
                return (
                  <TouchableOpacity
                    key={`add-${dayType}`}
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
            </ScrollView>
          )}
        </View>

        {/* Automatic Rest Day Banner on past dates with no logged workout */}
        {isPastDate && !completedSessionForDate && (
          <View style={styles.upNextBox}>
            <Moon size={14} color="#38BDF8" />
            <Text style={styles.upNextText}>
              {t.workout.noWorkoutOnDate.replace('{date}', formatDateDisplay(activeDate))}
            </Text>
          </View>
        )}

        {/* Simplified 4-Movement Adaptive Workout Card (Live Auto-Logs on Check) */}
        <AdaptiveWorkoutCard
          key={`${activeDate}-${currentSplit}`}
          plan={effectivePlan}
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

  // Smart 5-Pill Cycle Bar
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
    fontSize: 9.5,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  editCycleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  editCycleToggleText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10.5,
    color: COLORS.textSecondary,
  },
  editCycleHint: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    paddingHorizontal: 2,
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
  cyclePillDisabled: {
    opacity: 0.45,
    borderStyle: 'dashed',
  },
  cyclePillText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cyclePillTextDisabled: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
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

  // Quick 1-Tap Skip Workout Bar
  quickScheduleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: SPACING.md,
  },
  skipWorkoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.09)',
  },
  skipWorkoutBtnText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11.5,
    color: COLORS.warning,
  },
  askCoachPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  askCoachPillText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11.5,
  },

  // Rest & Muscle Recovery Card
  restDayCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  restHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  restIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restSuperLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: '#38BDF8',
    letterSpacing: 1,
  },
  restTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 17,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  restDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
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
  restActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  skipRestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  skipRestBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12.5,
    color: COLORS.textDark,
  },
  askCoachCompactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  askCoachCompactText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
  },
});
