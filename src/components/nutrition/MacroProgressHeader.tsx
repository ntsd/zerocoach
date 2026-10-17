import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { DateNavigationBar } from '../common/DateNavigationBar';
import { DailyNutritionLog, NutritionDailySummary } from '../../types/nutrition';
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
              {remaining > 0 ? `${remaining} kcal remaining` : 'Target reached!'}
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

        {/* 4 Macros Trackers */}
        <View style={styles.macroGrid}>
          {/* Protein */}
          <View style={styles.macroColumn}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>PROTEIN</Text>
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
              <Text style={styles.macroLabel}>CARBS</Text>
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
              <Text style={styles.macroLabel}>FAT</Text>
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
              <Text style={styles.macroLabel}>FIBER</Text>
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
    justifyContent: 'space-between',
    gap: 8,
  },
  macroColumn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 10,
  },
});
