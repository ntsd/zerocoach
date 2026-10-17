import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '@/theme/colors';
import { TYPOGRAPHY } from '@/theme/typography';
import { RADIUS, SPACING } from '@/theme/spacing';

export interface BarDataPoint {
  label: string;
  value: number;
  targetValue?: number;
  secondaryValue?: number;
  isToday?: boolean;
}

interface SvgBarChartProps {
  data: BarDataPoint[];
  barColor?: string;
  secondaryBarColor?: string;
  targetLineColor?: string;
  height?: number;
  unit?: string;
  maxValue?: number;
}

export const SvgBarChart: React.FC<SvgBarChartProps> = ({
  data,
  barColor = '#00F0FF',
  secondaryBarColor = 'rgba(255, 255, 255, 0.15)',
  targetLineColor = COLORS.warning,
  height = 140,
  unit = '',
  maxValue: explicitMax,
}) => {
  const [containerWidth, setContainerWidth] = React.useState(
    Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md * 2
  );

  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 14;
  const paddingBottom = 22;

  const chartWidth = Math.max(100, containerWidth);
  const chartHeight = height;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxValFromData = Math.max(
    ...data.map((d) => Math.max(d.value, d.targetValue || 0, d.secondaryValue || 0)),
    10
  );
  const maxVal = explicitMax || Math.ceil(maxValFromData * 1.15);

  const numBars = data.length;
  const barSlotWidth = innerWidth / Math.max(1, numBars);
  const barWidth = Math.min(22, Math.max(6, barSlotWidth * 0.55));

  const hasData = data.some((d) => d.value > 0 || (d.secondaryValue && d.secondaryValue > 0));

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 2) {
          setContainerWidth(w);
        }
      }}
    >
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={barColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={barColor} stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="activeTodayGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="100%" stopColor={barColor} stopOpacity="0.75" />
          </LinearGradient>
        </Defs>

        {/* Baseline (0) */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + innerHeight}
          x2={chartWidth - paddingRight}
          y2={paddingTop + innerHeight}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />

        {/* Bars rendering */}
        {data.map((item, idx) => {
          const slotCenterX = paddingLeft + idx * barSlotWidth + barSlotWidth / 2;
          const barX = slotCenterX - barWidth / 2;

          const barHeight = Math.max(
            item.value > 0 ? 3 : 0,
            (Math.min(maxVal, item.value) / maxVal) * innerHeight
          );
          const barY = paddingTop + innerHeight - barHeight;

          // Target line for this specific day
          const targetY =
            item.targetValue && item.targetValue > 0
              ? paddingTop + innerHeight - (Math.min(maxVal, item.targetValue) / maxVal) * innerHeight
              : null;

          return (
            <React.Fragment key={idx}>
              {/* Target dash indicator */}
              {targetY !== null && (
                <Line
                  x1={barX - 3}
                  y1={targetY}
                  x2={barX + barWidth + 3}
                  y2={targetY}
                  stroke={targetLineColor}
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
              )}

              {/* Bar background / empty slot */}
              <Rect
                x={barX}
                y={paddingTop}
                width={barWidth}
                height={innerHeight}
                rx={barWidth / 2}
                fill="rgba(255, 255, 255, 0.02)"
              />

              {/* Main value bar */}
              {item.value > 0 && (
                <Rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={Math.min(4, barWidth / 2)}
                  fill={item.isToday ? 'url(#activeTodayGrad)' : 'url(#barGrad)'}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      {/* X-axis Day Labels */}
      <View style={[styles.labelsRow, { paddingHorizontal: paddingLeft }]}>
        {data.map((item, idx) => (
          <View
            key={idx}
            style={[styles.labelSlot, { width: barSlotWidth }]}
          >
            <Text
              style={[
                styles.axisLabel,
                item.isToday && { color: barColor, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {!hasData && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>No data logged in this period</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
  },
  labelSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  emptyOverlay: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10.5,
    color: COLORS.textMuted,
    backgroundColor: 'rgba(8, 11, 16, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
});
