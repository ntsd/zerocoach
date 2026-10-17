import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import { useCoachStore } from '@/store/useCoachStore';
import { analyticsService } from '@/services/analytics/analyticsService';
import { TimeRangeFilter } from '@/types/history';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { SvgTrendLineChart } from '@/components/analytics/SvgTrendLineChart';
import { SvgBarChart } from '@/components/analytics/SvgBarChart';
import { ReadinessGauge } from '@/components/telemetry/ReadinessGauge';
import { MetricGrid } from '@/components/telemetry/MetricGrid';
import { HealthSyncGuideModal } from '@/components/telemetry/HealthSyncGuideModal';
import {
  Activity,
  Dumbbell,
  Utensils,
  Zap,
  Flame,
  Clock,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Watch,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react-native';

type DomainTab = 'workout' | 'nutrition' | 'recovery';

const TIME_RANGES: TimeRangeFilter[] = ['7D', '14D', '30D'];

export const AnalyzeScreen: React.FC = () => {
  const { mode } = useCoachStore();
  const modeColors = getModeColors(mode);

  const { metrics, syncing, syncTelemetry } = useTelemetryStore();
  const { historyByDate } = useWorkoutStore();
  const { logsByDate } = useNutritionStore();

  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('7D');
  const [activeDomain, setActiveDomain] = useState<DomainTab>('workout');
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Compute trends from the analytics engine
  const trends = useMemo(() => {
    return analyticsService.getTrends(timeRange);
  }, [timeRange, metrics, historyByDate, logsByDate]);

  // Overall Score Grade / Tier
  const getScoreRating = (score: number) => {
    if (score >= 85) return { label: 'PEAK ATHLETE', color: COLORS.success };
    if (score >= 70) return { label: 'OPTIMAL ADAPTATION', color: modeColors.accent };
    if (score >= 50) return { label: 'MODERATE FATIGUE', color: COLORS.warning };
    return { label: 'RECOVERY DELOAD', color: COLORS.strict.accent };
  };

  const rating = getScoreRating(trends.averageOverallScore);

  // Data for Hero Line Chart (Overall Score trend)
  const lineChartData = trends.points.map((p) => p.overallScore);
  const lineChartLabels = trends.points.map((p) => p.dayLabel);

  // Data for Workout Bar Chart (Movements/Sets completed)
  const workoutBarData = trends.points.map((p) => ({
    label: p.dayLabel,
    value: p.workoutTotalSets,
    isToday: p.isToday,
  }));

  // Data for Nutrition Bar Chart (Calories vs Target)
  const nutritionBarData = trends.points.map((p) => ({
    label: p.dayLabel,
    value: p.nutritionCalories,
    targetValue: p.targetCalories,
    isToday: p.isToday,
  }));

  // Data for Recovery Sleep Line Chart
  const sleepChartData = trends.points.map((p) => p.sleepHours);

  // Recent completed workout list
  const recentWorkouts = useMemo(() => {
    return Object.values(historyByDate)
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, 5);
  }, [historyByDate]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerLeft}>
              <Activity size={20} color={modeColors.accent} />
              <Text style={styles.title}>ANALYZE & TELEMETRY</Text>
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, { borderColor: `${modeColors.accent}40` }]}
              onPress={() => syncTelemetry()}
              disabled={syncing}
              activeOpacity={0.7}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={modeColors.accent} />
              ) : (
                <>
                  <RefreshCw size={13} color={modeColors.accent} />
                  <Text style={[styles.syncBtnText, { color: modeColors.accent }]}>Sync</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Unified Athletic Performance Score • Multi-Domain Bio-History
          </Text>
        </View>

        {/* Time Range Filter Bar */}
        <View style={styles.timeRangeBar}>
          {TIME_RANGES.map((tr) => {
            const isSelected = timeRange === tr;
            return (
              <TouchableOpacity
                key={tr}
                onPress={() => setTimeRange(tr)}
                style={[
                  styles.timeRangeOption,
                  isSelected && {
                    borderColor: modeColors.accent,
                    backgroundColor: `${modeColors.accent}20`,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    isSelected && { color: modeColors.accent, fontWeight: '800' },
                  ]}
                >
                  {tr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* HERO CARD: Unified Athletic Performance Score */}
        <GlassCard
          glowColor={`${modeColors.accent}25`}
          borderColor={`${modeColors.accent}40`}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleBox}>
              <View style={[styles.heroIconBadge, { backgroundColor: `${modeColors.accent}20` }]}>
                <Sparkles size={16} color={modeColors.accent} />
              </View>
              <View>
                <Text style={styles.heroSuperTitle}>COMPOSITE PERFORMANCE SCORE</Text>
                <View style={styles.heroScoreRow}>
                  <Text style={[styles.heroScoreBig, { color: modeColors.accent }]}>
                    {trends.averageOverallScore > 0 ? trends.averageOverallScore : '--'}
                  </Text>
                  <Text style={styles.heroScoreMax}>/ 100</Text>
                </View>
              </View>
            </View>

            <View style={[styles.ratingBadge, { borderColor: rating.color, backgroundColor: `${rating.color}15` }]}>
              <Text style={[styles.ratingBadgeText, { color: rating.color }]}>
                {trends.averageOverallScore > 0 ? rating.label : 'AWAITING LOGS'}
              </Text>
            </View>
          </View>

          {/* Domain Breakdown Micro-Bars */}
          <View style={styles.domainBreakdownRow}>
            {/* Recovery */}
            <View style={styles.domainItem}>
              <View style={styles.domainItemHeader}>
                <Text style={styles.domainItemLabel}>RECOVERY</Text>
                <Text style={[styles.domainItemVal, { color: COLORS.strict.accent }]}>
                  {trends.averageReadiness > 0 ? `${trends.averageReadiness}%` : '--'}
                </Text>
              </View>
              <View style={styles.domainBarBg}>
                <View
                  style={[
                    styles.domainBarFill,
                    {
                      width: `${trends.averageReadiness}%`,
                      backgroundColor: COLORS.strict.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.domainItemSub}>Weight: 35%</Text>
            </View>

            {/* Workout */}
            <View style={styles.domainItem}>
              <View style={styles.domainItemHeader}>
                <Text style={styles.domainItemLabel}>WORKOUT</Text>
                <Text style={[styles.domainItemVal, { color: modeColors.accent }]}>
                  {trends.totalWorkoutsCompleted > 0
                    ? `${trends.totalWorkoutsCompleted} done`
                    : '--'}
                </Text>
              </View>
              <View style={styles.domainBarBg}>
                <View
                  style={[
                    styles.domainBarFill,
                    {
                      width: `${Math.min(100, (trends.totalWorkoutsCompleted / (timeRange === '7D' ? 4 : 12)) * 100)}%`,
                      backgroundColor: modeColors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.domainItemSub}>Weight: 35%</Text>
            </View>

            {/* Nutrition */}
            <View style={styles.domainItem}>
              <View style={styles.domainItemHeader}>
                <Text style={styles.domainItemLabel}>NUTRITION</Text>
                <Text style={[styles.domainItemVal, { color: COLORS.warning }]}>
                  {trends.averageCalorieIntake > 0
                    ? `~${trends.averageCalorieIntake}`
                    : '--'}
                </Text>
              </View>
              <View style={styles.domainBarBg}>
                <View
                  style={[
                    styles.domainBarFill,
                    {
                      width: trends.averageCalorieIntake > 0 ? '85%' : '0%',
                      backgroundColor: COLORS.warning,
                    },
                  ]}
                />
              </View>
              <Text style={styles.domainItemSub}>Weight: 30%</Text>
            </View>
          </View>

          {/* Hero Trend Line Chart */}
          <View style={styles.heroChartSection}>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.chartSectionTitle}>
                {timeRange} COMPOSITE SCORE PROGRESSION
              </Text>
              <Text style={styles.chartSectionMeta}>
                {trends.totalDaysWithData} of {trends.points.length} days logged
              </Text>
            </View>
            <SvgTrendLineChart
              data={lineChartData}
              labels={lineChartLabels}
              height={140}
              strokeColor={modeColors.accent}
              targetLine={80}
            />
          </View>
        </GlassCard>

        {/* DOMAIN ANALYTICS SELECTOR TABS */}
        <View style={styles.domainTabsRow}>
          <TouchableOpacity
            onPress={() => setActiveDomain('workout')}
            style={[
              styles.domainTabBtn,
              activeDomain === 'workout' && [
                styles.domainTabBtnActive,
                { borderColor: modeColors.accent, backgroundColor: `${modeColors.accent}15` },
              ],
            ]}
            activeOpacity={0.8}
          >
            <Dumbbell
              size={14}
              color={activeDomain === 'workout' ? modeColors.accent : COLORS.textMuted}
            />
            <Text
              style={[
                styles.domainTabText,
                activeDomain === 'workout' && { color: modeColors.accent, fontWeight: '700' },
              ]}
            >
              Workout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveDomain('nutrition')}
            style={[
              styles.domainTabBtn,
              activeDomain === 'nutrition' && [
                styles.domainTabBtnActive,
                { borderColor: modeColors.accent, backgroundColor: `${modeColors.accent}15` },
              ],
            ]}
            activeOpacity={0.8}
          >
            <Utensils
              size={14}
              color={activeDomain === 'nutrition' ? modeColors.accent : COLORS.textMuted}
            />
            <Text
              style={[
                styles.domainTabText,
                activeDomain === 'nutrition' && { color: modeColors.accent, fontWeight: '700' },
              ]}
            >
              Nutrition
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveDomain('recovery')}
            style={[
              styles.domainTabBtn,
              activeDomain === 'recovery' && [
                styles.domainTabBtnActive,
                { borderColor: modeColors.accent, backgroundColor: `${modeColors.accent}15` },
              ],
            ]}
            activeOpacity={0.8}
          >
            <Zap
              size={14}
              color={activeDomain === 'recovery' ? modeColors.accent : COLORS.textMuted}
            />
            <Text
              style={[
                styles.domainTabText,
                activeDomain === 'recovery' && { color: modeColors.accent, fontWeight: '700' },
              ]}
            >
              Recovery
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* DOMAIN 1: WORKOUT ANALYTICS                                   */}
        {/* ============================================================== */}
        {activeDomain === 'workout' && (
          <View style={styles.domainContent}>
            {/* Quick KPI stats */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>SESSIONS</Text>
                <Text style={[styles.kpiVal, { color: modeColors.accent }]}>
                  {trends.totalWorkoutsCompleted}
                </Text>
                <Text style={styles.kpiSub}>Completed</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>ACTIVE BURN</Text>
                <Text style={[styles.kpiVal, { color: COLORS.warning }]}>
                  ~{trends.totalCaloriesBurned}
                </Text>
                <Text style={styles.kpiSub}>Total kcal</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>TOTAL SETS</Text>
                <Text style={[styles.kpiVal, { color: COLORS.textPrimary }]}>
                  {trends.points.reduce((acc, p) => acc + p.workoutTotalSets, 0)}
                </Text>
                <Text style={styles.kpiSub}>Volume</Text>
              </View>
            </View>

            {/* Volume Chart */}
            <GlassCard style={styles.chartCard}>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartSectionTitle}>DAILY SETS & VOLUME</Text>
                <Text style={styles.chartSectionMeta}>Total working sets</Text>
              </View>
              <SvgBarChart
                data={workoutBarData}
                barColor={modeColors.accent}
                height={130}
              />
            </GlassCard>

            {/* Recent Completed Sessions */}
            <View style={styles.sectionTitleRow}>
              <Calendar size={14} color={modeColors.accent} />
              <Text style={styles.domainSectionHeading}>RECENT COMPLETED SESSIONS</Text>
            </View>

            {recentWorkouts.length > 0 ? (
              recentWorkouts.map((session) => (
                <GlassCard key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionTopRow}>
                    <View style={styles.sessionTitleBox}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      <Text style={styles.sessionDate}>{session.date}</Text>
                    </View>
                    <View style={styles.sessionBadge}>
                      <CheckCircle2 size={12} color={COLORS.success} />
                      <Text style={styles.sessionBadgeText}>COMPLETED</Text>
                    </View>
                  </View>

                  <View style={styles.sessionSpecsRow}>
                    <View style={styles.sessionSpecItem}>
                      <Clock size={11} color={COLORS.textMuted} />
                      <Text style={styles.sessionSpecText}>{session.durationMinutes} min</Text>
                    </View>
                    <View style={styles.sessionSpecItem}>
                      <Flame size={11} color={COLORS.warning} />
                      <Text style={styles.sessionSpecText}>{session.caloriesBurned} kcal</Text>
                    </View>
                    <View style={styles.sessionSpecItem}>
                      <Layers size={11} color={modeColors.accent} />
                      <Text style={styles.sessionSpecText}>
                        {session.completedMovements} movements ({session.totalSets} sets)
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              ))
            ) : (
              <GlassCard style={styles.emptyCard}>
                <Dumbbell size={28} color={COLORS.textMuted} />
                <Text style={styles.emptyCardTitle}>No completed workouts yet</Text>
                <Text style={styles.emptyCardSub}>
                  Complete your daily workout in the Workout tab to see session summaries here.
                </Text>
              </GlassCard>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* DOMAIN 2: NUTRITION ANALYTICS                                 */}
        {/* ============================================================== */}
        {activeDomain === 'nutrition' && (
          <View style={styles.domainContent}>
            {/* Quick KPI stats */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>AVG CALORIES</Text>
                <Text style={[styles.kpiVal, { color: COLORS.warning }]}>
                  {trends.averageCalorieIntake > 0 ? trends.averageCalorieIntake : '--'}
                </Text>
                <Text style={styles.kpiSub}>kcal / day</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>LOGGED DAYS</Text>
                <Text style={[styles.kpiVal, { color: modeColors.accent }]}>
                  {trends.points.filter((p) => p.nutritionCalories > 0).length}
                </Text>
                <Text style={styles.kpiSub}>of {trends.points.length} days</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>AVG PROTEIN</Text>
                <Text style={[styles.kpiVal, { color: COLORS.textPrimary }]}>
                  {trends.points.filter((p) => p.nutritionProtein > 0).length > 0
                    ? Math.round(
                        trends.points.reduce((acc, p) => acc + p.nutritionProtein, 0) /
                          Math.max(1, trends.points.filter((p) => p.nutritionProtein > 0).length)
                      )
                    : '--'}
                  g
                </Text>
                <Text style={styles.kpiSub}>Daily avg</Text>
              </View>
            </View>

            {/* Calorie Intake vs Target Bar Chart */}
            <GlassCard style={styles.chartCard}>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartSectionTitle}>CALORIE INTAKE VS TARGET</Text>
                <Text style={styles.chartSectionMeta}>Dash = Target line</Text>
              </View>
              <SvgBarChart
                data={nutritionBarData}
                barColor={COLORS.warning}
                targetLineColor={COLORS.textPrimary}
                height={140}
              />
            </GlassCard>
          </View>
        )}

        {/* ============================================================== */}
        {/* DOMAIN 3: RECOVERY & TELEMETRY LIVE HUB                        */}
        {/* ============================================================== */}
        {activeDomain === 'recovery' && (
          <View style={styles.domainContent}>
            {/* Live CNS Readiness Gauge */}
            <ReadinessGauge score={metrics.readinessScore} />

            {/* Wearable Sync Bridge CTA */}
            <TouchableOpacity
              style={[styles.bridgeCtaBtn, { borderColor: `${modeColors.accent}50` }]}
              onPress={() => setShowSyncModal(true)}
              activeOpacity={0.8}
            >
              <Watch size={16} color={modeColors.accent} />
              <View style={styles.bridgeCtaTextCol}>
                <Text style={[styles.bridgeCtaTitle, { color: modeColors.accent }]}>
                  Multi-Wearable & Health Companion Hub
                </Text>
                <Text style={styles.bridgeCtaSub}>
                  Garmin • Apple Watch • Whoop • Oura • Samsung • Strava
                </Text>
              </View>
            </TouchableOpacity>

            {/* Live Metrics Grid */}
            <MetricGrid metrics={metrics} />

            {/* Sleep Architecture Trend */}
            <GlassCard style={styles.chartCard}>
              <View style={styles.chartHeaderRow}>
                <Text style={styles.chartSectionTitle}>SLEEP DURATION TREND</Text>
                <Text style={styles.chartSectionMeta}>Avg: {trends.averageSleepHours} hrs</Text>
              </View>
              <SvgTrendLineChart
                data={sleepChartData}
                labels={lineChartLabels}
                height={130}
                strokeColor={COLORS.strict.accent}
                targetLine={8}
                minValue={0}
                maxValue={12}
              />
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* Fitness App Sync Modal */}
      <HealthSyncGuideModal
        visible={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onTriggerSync={syncTelemetry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + 40,
    gap: SPACING.md,
  },
  header: {
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
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
    fontSize: 11,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  syncBtnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '800',
  },
  timeRangeBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 4,
  },
  timeRangeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timeRangeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  heroCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSuperTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 1,
  },
  heroScoreBig: {
    ...TYPOGRAPHY.h1,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  heroScoreMax: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  ratingBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  domainBreakdownRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  domainItem: {
    flex: 1,
    gap: 3,
  },
  domainItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  domainItemLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 8.5,
    color: COLORS.textMuted,
  },
  domainItemVal: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    fontWeight: '800',
  },
  domainBarBg: {
    height: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  domainBarFill: {
    height: '100%',
    borderRadius: RADIUS.round,
  },
  domainItemSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 8,
    color: COLORS.textMuted,
  },
  heroChartSection: {
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chartSectionTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9.5,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  chartSectionMeta: {
    ...TYPOGRAPHY.caption,
    fontSize: 9.5,
    color: COLORS.textMuted,
  },
  domainTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  domainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  domainTabBtnActive: {
    borderWidth: 1,
  },
  domainTabText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  domainContent: {
    gap: SPACING.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 2,
  },
  kpiLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 8.5,
    color: COLORS.textMuted,
  },
  kpiVal: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    fontWeight: '800',
  },
  kpiSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  chartCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  domainSectionHeading: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  sessionCard: {
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionTitleBox: {
    flex: 1,
  },
  sessionTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  sessionDate: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  sessionBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 8,
    color: COLORS.success,
    fontWeight: '800',
  },
  sessionSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  sessionSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionSpecText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10.5,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    gap: 6,
  },
  emptyCardTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyCardSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  bridgeCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
  },
  bridgeCtaTextCol: {
    flex: 1,
  },
  bridgeCtaTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
  },
  bridgeCtaSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});
