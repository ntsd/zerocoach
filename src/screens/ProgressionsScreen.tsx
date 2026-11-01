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
    getScheduledSplitForDate,
    setSplitForDate,
    skipWorkoutDay,
    skipRestDay,
    toggleCycleDayType,
  } = useWorkoutStore();
  const modeColors = getModeColors();

  const [isEditingCycle, setIsEditingCycle] = useState(false);

  const todayStr = useMemo(() => getTodayDateString(), []);
  const activeDate = selectedDate || todayStr;
  const isToday = activeDate === todayStr;
  const completedSessionForDate = (historyByDate || {})[activeDate];

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

  // Scheduled day type from the rolling cycle + any skip/override shifts
  const currentSplit = useMemo(() => {
    return getScheduledSplitForDate(activeDate);
  }, [
    activeDate,
    activeCycle,
    scheduleOverridesByDate,
    cycleAnchorDate,
    cycleAnchorIndex,
    getScheduledSplitForDate,
  ]);

  const tomorrowDate = useMemo(() => addDaysToDateString(activeDate, 1), [activeDate]);
  const tomorrowSplit = useMemo(() => {
    return getScheduledSplitForDate(tomorrowDate);
  }, [
    tomorrowDate,
    activeCycle,
    scheduleOverridesByDate,
    cycleAnchorDate,
    cycleAnchorIndex,
    getScheduledSplitForDate,
  ]);

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

  const pillsToDisplay = isEditingCycle ? ALL_CYCLE_DAY_TYPES : activeCycle;

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

        {/* Contextual Notice for Completed Sessions */}
        {completedSessionForDate && (
          <View style={styles.pastDateBanner}>
            <CheckCircle2 size={14} color={COLORS.success} />
            <Text style={styles.pastDateBannerText}>
              {t.workout.completedOnDate.replace(
                '{date}',
                `${formatDateDisplay(activeDate)} (${activeDate})`
              )}
            </Text>
          </View>
        )}

        {/* ========================================================== */}
        {/* SMART 5-PILL WORKOUT CYCLE BAR (PUSH · PULL · LEGS · CARDIO · REST) */}
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
            <Text style={styles.editCycleHint}>{t.workout.editCycleHint}</Text>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.cyclePillScroll}
            contentContainerStyle={styles.cyclePillContent}
          >
            {pillsToDisplay.map((dayType) => {
              const meta = CYCLE_PILL_META[dayType];
              const IconComp = meta.icon;
              const label = (t.workout.splits as any)[dayType] || meta.defaultLabel;
              const isInCycle = activeCycle.includes(dayType);
              const isSelectedToday = !isEditingCycle && currentSplit === dayType;
              const pillAccent = meta.accentColor || modeColors.accent;

              return (
                <TouchableOpacity
                  key={dayType}
                  onPress={() => {
                    if (isEditingCycle) {
                      toggleCycleDayType(dayType);
                    } else {
                      setSplitForDate(activeDate, dayType);
                    }
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.cyclePill,
                    isEditingCycle && !isInCycle && styles.cyclePillDisabled,
                    isEditingCycle &&
                      isInCycle && {
                        borderColor: `${pillAccent}70`,
                        backgroundColor: `${pillAccent}18`,
                      },
                    isSelectedToday && {
                      borderColor: pillAccent,
                      backgroundColor: `${pillAccent}25`,
                    },
                  ]}
                >
                  <IconComp
                    size={13}
                    color={
                      isEditingCycle
                        ? isInCycle
                          ? pillAccent
                          : COLORS.textMuted
                        : isSelectedToday
                        ? pillAccent
                        : COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.cyclePillText,
                      isEditingCycle && !isInCycle && styles.cyclePillTextDisabled,
                      (isSelectedToday || (isEditingCycle && isInCycle)) && {
                        color: pillAccent,
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  {isEditingCycle && (
                    <View
                      style={[
                        styles.cycleEditBadge,
                        {
                          backgroundColor: isInCycle
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(16, 185, 129, 0.2)',
                        },
                      ]}
                    >
                      {isInCycle ? (
                        <X size={9} color={COLORS.danger} />
                      ) : (
                        <Plus size={9} color={COLORS.success} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ========================================================== */}
        {/* 1-TAP SCHEDULE ROLLOVER ACTION OR REST DAY RECOVERY CARD   */}
        {/* ========================================================== */}
        {currentSplit === 'rest' ? (
          <GlassCard
            glowColor="rgba(56, 189, 248, 0.22)"
            borderColor="rgba(56, 189, 248, 0.4)"
            style={styles.restDayCard}
          >
            <View style={styles.restHeaderRow}>
              <View style={styles.restIconCircle}>
                <Moon size={20} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.restSuperLabel}>ACTIVE RECOVERY & CNS RESET</Text>
                <Text style={styles.restTitle}>{t.workout.restDayTitle}</Text>
              </View>
            </View>

            <Text style={styles.restDesc}>{t.workout.restDayDesc}</Text>

            <View style={styles.upNextBox}>
              <Calendar size={13} color="#38BDF8" />
              <Text style={styles.upNextText}>
                {t.workout.tomorrowUpNext.replace(
                  '{split}',
                  (t.workout.splits as any)[tomorrowSplit] || tomorrowSplit.toUpperCase()
                )}
              </Text>
            </View>

            <View style={styles.restActionsRow}>
              <TouchableOpacity
                onPress={() => skipRestDay(activeDate)}
                style={[styles.skipRestBtn, { backgroundColor: modeColors.accent }]}
                activeOpacity={0.85}
              >
                <FastForward size={14} color={COLORS.textDark} />
                <Text style={styles.skipRestBtnText}>{t.workout.skipRestBtn}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAskCoachPlan}
                style={[styles.askCoachCompactBtn, { borderColor: `${modeColors.accent}45` }]}
                activeOpacity={0.8}
              >
                <MessageSquare size={14} color={modeColors.accent} />
                <Text style={[styles.askCoachCompactText, { color: modeColors.accent }]}>
                  {t.workout.askCoach}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : (
          <>
            {/* Quick 1-Tap Skip Workout Bar (shifts today's workout to tomorrow) */}
            <View style={styles.quickScheduleBar}>
              <TouchableOpacity
                onPress={() => skipWorkoutDay(activeDate)}
                style={styles.skipWorkoutBtn}
                activeOpacity={0.8}
              >
                <SkipForward size={13} color={COLORS.warning} />
                <Text style={styles.skipWorkoutBtnText}>{t.workout.skipWorkoutBtn}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAskCoachPlan}
                style={[styles.askCoachPillBtn, { borderColor: `${modeColors.accent}40` }]}
                activeOpacity={0.8}
              >
                <Sparkles size={12} color={modeColors.accent} />
                <Text style={[styles.askCoachPillText, { color: modeColors.accent }]}>
                  {t.workout.askCoach}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Simplified 4-Movement Adaptive Workout Card */}
            <AdaptiveWorkoutCard
              key={`${activeDate}-${currentSplit}`}
              plan={effectivePlan}
              date={activeDate}
              onAskCoach={() => handleAskCoachPlan()}
            />
          </>
        )}
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
