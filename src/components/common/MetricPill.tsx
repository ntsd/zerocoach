import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';

interface MetricPillProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}

export const MetricPill: React.FC<MetricPillProps> = ({
  label,
  value,
  color = COLORS.strict.accent,
  icon,
}) => {
  return (
    <View
      style={[
        styles.pill,
        {
          borderColor: `${color}40`,
          backgroundColor: `${color}12`,
        },
      ]}
    >
      {icon}
      <Text style={[styles.label, { color }]}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  label: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  value: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
