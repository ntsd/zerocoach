import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TelemetryMetrics } from '@/types/telemetry';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { Moon, Heart, Flame, Footprints, Watch } from 'lucide-react-native';

interface MetricGridProps {
  metrics: TelemetryMetrics;
}

export const MetricGrid: React.FC<MetricGridProps> = ({ metrics }) => {
  const isSynced = metrics.lastSyncTimestamp > 0 && metrics.source !== 'manual';

  return (
    <View style={styles.grid}>
      {/* 1. Sleep Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Moon size={16} color={COLORS.purpleAccent} />
          <Text style={styles.cardTitle}>SLEEP ARCHITECTURE</Text>
        </View>
        <Text style={styles.mainValue}>{isSynced ? `${metrics.sleepHours} hrs` : '-- hrs'}</Text>
        <View style={styles.subStats}>
          <Text style={styles.subText}>{isSynced ? `Deep: ${metrics.deepSleepHours}h` : 'No Wearable'}</Text>
          <Text style={styles.subText}>{isSynced ? `Quality: ${metrics.sleepQualityScore}%` : 'Sync to Track'}</Text>
        </View>
      </GlassCard>

      {/* 2. Cardiac Recovery Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Heart size={16} color={COLORS.danger} />
          <Text style={styles.cardTitle}>CARDIAC AUTONOMIC</Text>
        </View>
        <Text style={styles.mainValue}>{isSynced ? `${metrics.restingHeartRate} bpm` : '-- bpm'}</Text>
        <View style={styles.subStats}>
          <Text style={styles.subText}>{isSynced ? `HRV: ${metrics.heartRateVariability} ms` : 'No Wearable'}</Text>
          <Text style={styles.subText}>{isSynced ? 'Resting Baseline' : 'Sync to Track'}</Text>
        </View>
      </GlassCard>

      {/* 3. Caloric Expenditure Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Flame size={16} color={COLORS.warning} />
          <Text style={styles.cardTitle}>ACTIVE EXPENDITURE</Text>
        </View>
        <Text style={styles.mainValue}>{isSynced ? `${metrics.activeCalories} kcal` : '-- kcal'}</Text>
        <View style={styles.subStats}>
          <Text style={styles.subText}>{isSynced ? 'Burned Today' : 'Standard Baseline'}</Text>
          <Text style={styles.subText}>{isSynced ? 'Adaptive Intake' : 'Sync to Track'}</Text>
        </View>
      </GlassCard>

      {/* 4. Movement & Steps Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Footprints size={16} color={COLORS.strict.accent} />
          <Text style={styles.cardTitle}>DAILY MOVEMENT</Text>
        </View>
        <Text style={styles.mainValue}>
          {isSynced ? metrics.steps.toLocaleString() : '--'}
        </Text>
        <View style={styles.subStats}>
          <Text style={styles.subText}>
            {isSynced ? `Source: ${metrics.source.replace('_', ' ').toUpperCase()}` : 'Sync Wearable'}
          </Text>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  mainValue: {
    ...TYPOGRAPHY.metricMedium,
    fontSize: 22,
    color: COLORS.textPrimary,
    marginVertical: 4,
  },
  subStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  subText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});
