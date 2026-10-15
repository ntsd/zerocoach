import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getReadinessCategory } from '@/services/telemetry/readinessCalculator';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { Zap, ShieldCheck } from 'lucide-react-native';

interface ReadinessGaugeProps {
  score: number;
}

export const ReadinessGauge: React.FC<ReadinessGaugeProps> = ({ score }) => {
  const isSynced = score > 0;
  const category = isSynced
    ? getReadinessCategory(score)
    : {
        category: 'none',
        label: 'NO WEARABLE SYNCED',
        guidance: 'Sync your fitness app via local health hub to calculate your daily recovery readiness score.',
        color: COLORS.textMuted,
      };

  return (
    <GlassCard glowColor={isSynced ? category.color : undefined} borderColor={isSynced ? `${category.color}40` : COLORS.borderSubtle}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Zap size={14} color={category.color} />
          <Text style={[styles.badgeText, { color: category.color }]}>
            DAILY READINESS SCORE
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {isSynced ? '100% On-Device Analysis' : 'Wearable Sync Required'}
        </Text>
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreNumber, { color: category.color }]}>
            {isSynced ? score : '--'}
          </Text>
          {isSynced && <Text style={styles.scoreMax}>/100</Text>}
        </View>

        <View style={styles.detailsCol}>
          <Text style={[styles.categoryLabel, { color: category.color }]}>
            {category.label}
          </Text>
          <Text style={styles.guidanceText}>{category.guidance}</Text>
        </View>
      </View>

      {/* Visual Progress Bar */}
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {
              width: `${isSynced ? Math.min(100, Math.max(5, score)) : 0}%`,
              backgroundColor: category.color,
            },
          ]}
        />
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
  },
  timestamp: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  scoreCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    ...TYPOGRAPHY.metricLarge,
    fontSize: 34,
    lineHeight: 38,
  },
  scoreMax: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: -2,
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryLabel: {
    ...TYPOGRAPHY.h3,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  guidanceText: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardSecondary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
