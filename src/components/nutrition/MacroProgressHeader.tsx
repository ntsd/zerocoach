import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { DateNavigationBar } from '../common/DateNavigationBar';
import { DailyNutritionLog, NutritionDailySummary, DAILY_RDA_TARGETS } from '../../types/nutrition';
import { useTranslation } from '../../i18n';
import { COLORS } from '../../theme/colors';
import { Flame, Target } from 'lucide-react-native';

interface MacroProgressHeaderProps {
  currentDate: string;
  dailyLog: DailyNutritionLog;
  summary: NutritionDailySummary;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

export const MacroProgressHeader: React.FC<MacroProgressHeaderProps> = ({
  currentDate,
  dailyLog,
  summary,
  onPrevDay,
  onNextDay,
  onToday,
}) => {
  const { t } = useTranslation();
  const calProgress = Math.min(100, summary.calorieProgressPercent);
  const remaining = Math.max(0, dailyLog.targetCalories - summary.totalCalories);

  return (
    <View style={styles.container}>
      {/* Date Navigation Bar */}
      <DateNavigationBar
        currentDate={currentDate}
        onPrevDay={onPrevDay}
        onNextDay={onNextDay}
        onToday={onToday}
        accentColor="#10B981"
      />

      {/* Primary Calorie & Macro Card */}
      <GlassCard style={styles.card}>
        <View style={styles.calorieRow}>
          <View style={styles.calorieMain}>
            <View style={styles.calorieIconRow}>
              <Flame size={20} color="#FF6B35" />
              <Text style={styles.calorieConsumedText}>{summary.totalCalories}</Text>
              <Text style={styles.calorieTargetText}>/ {dailyLog.targetCalories} kcal</Text>
            </View>
            <Text style={styles.calorieSubtext}>
              {remaining > 0
                ? `${remaining} ${t.nutrition.header.caloriesRemaining}`
                : t.nutrition.header.targetReached}
            </Text>
          </View>

          <View style={styles.targetBadge}>
            <Target size={14} color={COLORS.strict.accent} />
            <Text style={styles.targetBadgeText}>{calProgress}%</Text>
          </View>
        </View>

        {/* Calorie Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${calProgress}%`,
                backgroundColor: calProgress >= 100 ? '#10B981' : '#00F0FF',
              },
            ]}
          />
        </View>

        {/* 5 Macros Trackers */}
        <View style={styles.macroGrid}>
          {/* Protein */}
          <View style={styles.macroColumn}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel} numberOfLines={1}>{t.nutrition.header.protein}</Text>
              <Text style={[styles.macroValue, { color: '#10B981' }]}>
                {Math.round(summary.totalProtein)}g
              </Text>
            </View>
            <View style={styles.miniBarTrack}>
              <View
                style={[
                  styles.miniBarFill,
                  { width: `${summary.proteinProgressPercent}%`, backgroundColor: '#10B981' },
                ]}
              />
            </View>
            <Text style={styles.macroTargetSub}>/ {dailyLog.targetProtein}g</Text>
          </View>

          {/* Carbs */}
          <View style={styles.macroColumn}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel} numberOfLines={1}>{t.nutrition.header.carbs}</Text>
              <Text style={[styles.macroValue, { color: '#38BDF8' }]}>
                {Math.round(summary.totalCarbs)}g
              </Text>
            </View>
            <View style={styles.miniBarTrack}>
              <View
                style={[
                  styles.miniBarFill,
                  { width: `${summary.carbsProgressPercent}%`, backgroundColor: '#38BDF8' },
                ]}
              />
            </View>
            <Text style={styles.macroTargetSub}>/ {dailyLog.targetCarbs}g</Text>
          </View>

          {/* Fat */}
          <View style={styles.macroColumn}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel} numberOfLines={1}>{t.nutrition.header.fat}</Text>
              <Text style={[styles.macroValue, { color: '#F59E0B' }]}>
                {Math.round(summary.totalFat)}g
              </Text>
            </View>
            <View style={styles.miniBarTrack}>
              <View
                style={[
                  styles.miniBarFill,
                  { width: `${summary.fatProgressPercent}%`, backgroundColor: '#F59E0B' },
                ]}
              />
            </View>
            <Text style={styles.macroTargetSub}>/ {dailyLog.targetFat}g</Text>
          </View>

          {/* Fiber */}
          <View style={styles.macroColumn}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel} numberOfLines={1}>{t.nutrition.scorecard.fiber}</Text>
              <Text style={[styles.macroValue, { color: '#A855F7' }]}>
                {Math.round(summary.totalFiber)}g
              </Text>
            </View>
            <View style={styles.miniBarTrack}>
              <View
                style={[
                  styles.miniBarFill,
                  { width: `${summary.fiberProgressPercent}%`, backgroundColor: '#A855F7' },
                ]}
              />
            </View>
            <Text style={styles.macroTargetSub}>/ {dailyLog.targetFiber}g</Text>
          </View>

          {/* Sugar (Daily Max Ceiling — Less is Better) */}
          {(() => {
            const sugarColor =
              summary.totalSugar > summary.sugarLimitGrams
                ? '#EF4444'
                : summary.totalSugar > summary.sugarLimitGrams * 0.65
                  ? '#F59E0B'
                  : '#10B981';
            return (
              <View style={styles.macroColumn}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel} numberOfLines={1}>{t.nutrition.header.sugar}</Text>
                  <Text style={[styles.macroValue, { color: sugarColor }]}>
                    {Math.round(summary.totalSugar)}g
                  </Text>
                </View>
                <View style={styles.miniBarTrack}>
                  <View
                    style={[
                      styles.miniBarFill,
                      { width: `${summary.sugarProgressPercent}%`, backgroundColor: sugarColor },
                    ]}
                  />
                </View>
                <Text style={styles.macroTargetSub}>/ &lt;{summary.sugarLimitGrams}g</Text>
              </View>
            );
          })()}

          {/* Sodium (Daily Limit — Less is Better) */}
          {(() => {
            const sodiumLimit = DAILY_RDA_TARGETS.sodium_mg_limit;
            const sodiumPct = Math.min(100, Math.round((summary.totalSodium_mg / sodiumLimit) * 100));
            const sodiumColor =
              summary.totalSodium_mg > sodiumLimit
                ? '#EF4444'
                : summary.totalSodium_mg > sodiumLimit * 0.65
                  ? '#F59E0B'
                  : '#10B981';
            return (
              <View style={styles.macroColumn}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel} numberOfLines={1}>{t.nutrition.header.sodium}</Text>
                  <Text style={[styles.macroValue, { color: sodiumColor }]}>
                    {Math.round(summary.totalSodium_mg)}mg
                  </Text>
                </View>
                <View style={styles.miniBarTrack}>
                  <View
                    style={[
                      styles.miniBarFill,
                      { width: `${sodiumPct}%`, backgroundColor: sodiumColor },
                    ]}
                  />
                </View>
                <Text style={styles.macroTargetSub}>/ &lt;{sodiumLimit}mg</Text>
              </View>
            );
          })()}
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  card: {
    padding: 16,
    backgroundColor: '#0F141C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calorieMain: {
    flex: 1,
  },
  calorieIconRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  calorieConsumedText: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  calorieTargetText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  calorieSubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  targetBadgeText: {
    color: COLORS.strict.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  macroColumn: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  macroLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  miniBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroTargetSub: {
    color: COLORS.textMuted,
    fontSize: 10.5,
  },
});
