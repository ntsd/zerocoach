import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TelemetryMetrics } from '@/types/telemetry';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { Moon, Heart, Flame, Footprints, Watch, Scale } from 'lucide-react-native';
import { useCoachStore } from '@/store/useCoachStore';

interface MetricGridProps {
  metrics: TelemetryMetrics;
}

export const MetricGrid: React.FC<MetricGridProps> = ({ metrics }) => {
  const isSynced = metrics.lastSyncTimestamp > 0 && metrics.source !== 'manual';
  const userProfile = useCoachStore((s) => s.userProfile);

  const displayWeight =
    metrics.weightKg && metrics.weightKg > 0
      ? metrics.weightKg
      : userProfile?.weightKg && userProfile.weightKg > 0
      ? userProfile.weightKg
      : null;

  const displayHeight =
    metrics.heightCm && metrics.heightCm > 0
      ? metrics.heightCm
      : userProfile?.heightCm && userProfile.heightCm > 0
      ? userProfile.heightCm
      : null;

  const isFromHealthConnect = Boolean(
    (metrics.weightKg && metrics.weightKg > 0) ||
    (metrics.heightCm && metrics.heightCm > 0)
  );
  const isFromProfile = Boolean(
    !isFromHealthConnect && ((userProfile?.weightKg ?? 0) > 0 || (userProfile?.heightCm ?? 0) > 0)
  );

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

      {/* 5. Anthropometrics / Weight & Height Card */}
      <GlassCard style={[styles.card, styles.fullWidthCard]}>
        <View style={styles.cardHeader}>
          <Scale size={16} color={COLORS.strict.accent} />
          <Text style={styles.cardTitle}>BODY ANTHROPOMETRICS</Text>
        </View>
        <View style={styles.bodyMetricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricSubLabel}>BODY WEIGHT</Text>
            <Text style={styles.mainValue}>
              {displayWeight ? `${displayWeight} kg` : '-- kg'}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricSubLabel}>HEIGHT</Text>
            <Text style={styles.mainValue}>
              {displayHeight ? `${displayHeight} cm` : '-- cm'}
            </Text>
          </View>
        </View>
        <View style={styles.subStats}>
          <Text style={styles.subText}>
            {isFromHealthConnect
              ? 'Synced from Health Connect'
              : isFromProfile
              ? 'From Athlete Profile (Companion app did not sync weight)'
              : 'Sync from Health Connect or set in Profile'}
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
  fullWidthCard: {
    flexBasis: '100%',
  },
  bodyMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 4,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricSubLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.borderSubtle,
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
