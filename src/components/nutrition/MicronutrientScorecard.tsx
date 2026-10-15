import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { NutritionDailySummary, DAILY_RDA_TARGETS } from '../../types/nutrition';
import { COLORS } from '../../theme/colors';
import { Sparkles, ChevronDown, ChevronUp, ShieldAlert, Award } from 'lucide-react-native';

interface MicronutrientScorecardProps {
  summary: NutritionDailySummary;
}

interface NutrientItemConfig {
  label: string;
  current: number;
  unit: string;
  target: number;
  isLimit?: boolean;
}

export const MicronutrientScorecard: React.FC<MicronutrientScorecardProps> = ({ summary }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const vitamins: NutrientItemConfig[] = [
    { label: 'Vitamin A', current: summary.totalVitaminA_mcg, unit: 'mcg', target: DAILY_RDA_TARGETS.vitaminA_mcg },
    { label: 'Vitamin C', current: summary.totalVitaminC_mg, unit: 'mg', target: DAILY_RDA_TARGETS.vitaminC_mg },
    { label: 'Vitamin D', current: summary.totalVitaminD_mcg, unit: 'mcg', target: DAILY_RDA_TARGETS.vitaminD_mcg },
    { label: 'Vitamin B12', current: summary.totalVitaminB12_mcg, unit: 'mcg', target: DAILY_RDA_TARGETS.vitaminB12_mcg },
  ];

  const minerals: NutrientItemConfig[] = [
    { label: 'Iron', current: summary.totalIron_mg, unit: 'mg', target: DAILY_RDA_TARGETS.iron_mg },
    { label: 'Calcium', current: summary.totalCalcium_mg, unit: 'mg', target: DAILY_RDA_TARGETS.calcium_mg },
    { label: 'Magnesium', current: summary.totalMagnesium_mg, unit: 'mg', target: DAILY_RDA_TARGETS.magnesium_mg },
    { label: 'Potassium', current: summary.totalPotassium_mg, unit: 'mg', target: DAILY_RDA_TARGETS.potassium_mg },
    { label: 'Zinc', current: summary.totalZinc_mg, unit: 'mg', target: DAILY_RDA_TARGETS.zinc_mg },
    { label: 'Sodium', current: summary.totalSodium_mg, unit: 'mg', target: DAILY_RDA_TARGETS.sodium_mg_limit, isLimit: true },
  ];

  // Calculate composite score (percentage of key micronutrients met)
  const trackableItems = [...vitamins, ...minerals.filter((m) => !m.isLimit)];
  const metCount = trackableItems.filter((i) => (i.current / i.target) >= 0.8).length;
  const overallPercentage = Math.round((metCount / trackableItems.length) * 100);

  const renderMeter = (item: NutrientItemConfig) => {
    const ratio = item.target > 0 ? item.current / item.target : 0;
    const pct = Math.min(100, Math.round(ratio * 100));

    let barColor = '#38BDF8';
    let statusText = `${pct}%`;

    if (item.isLimit) {
      if (item.current > item.target) {
        barColor = '#EF4444';
        statusText = 'High';
      } else {
        barColor = '#10B981';
        statusText = 'Under Limit';
      }
    } else {
      if (pct >= 100) {
        barColor = '#10B981';
        statusText = 'Optimal';
      } else if (pct >= 50) {
        barColor = '#F59E0B';
        statusText = `${pct}%`;
      } else {
        barColor = '#64748B';
        statusText = `${pct}%`;
      }
    }

    return (
      <View key={item.label} style={styles.metricItem}>
        <View style={styles.metricTop}>
          <Text style={styles.metricLabel}>{item.label}</Text>
          <Text style={styles.metricValue}>
            {item.current}
            <Text style={styles.metricUnit}> {item.unit}</Text>
            <Text style={styles.metricTarget}> / {item.target}{item.unit}</Text>
          </Text>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: barColor }]}>{statusText}</Text>
        </View>
      </View>
    );
  };

  return (
    <GlassCard style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.headerButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Sparkles size={16} color="#00F0FF" />
          </View>
          <View>
            <Text style={styles.title}>Micronutrient Bio-Profile</Text>
            <Text style={styles.subtitle}>
              {metCount} of {trackableItems.length} essential targets achieved ({overallPercentage}%)
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.scorePill}>
            <Award size={12} color="#10B981" />
            <Text style={styles.scorePillText}>{overallPercentage}%</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={18} color={COLORS.textSecondary} />
          ) : (
            <ChevronDown size={18} color={COLORS.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Explanation note */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              ZeroCoach aggregates lab-assayed USDA whole foods & Open Food Facts data to track full vitamins and minerals.
            </Text>
          </View>

          {/* Key Vitamins */}
          <Text style={styles.sectionHeading}>KEY VITAMINS (RDA)</Text>
          <View style={styles.grid}>{vitamins.map(renderMeter)}</View>

          {/* Key Minerals */}
          <Text style={[styles.sectionHeading, { marginTop: 16 }]}>KEY MINERALS & ELECTROLYTES</Text>
          <View style={styles.grid}>{minerals.map(renderMeter)}</View>
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    backgroundColor: '#0F141C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scorePillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  infoBanner: {
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.12)',
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  sectionHeading: {
    color: COLORS.strict.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 8,
  },
  metricTop: {
    marginBottom: 4,
  },
  metricLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  metricUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  metricTarget: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '400',
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
