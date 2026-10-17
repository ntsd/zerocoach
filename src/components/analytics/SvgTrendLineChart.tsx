import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import { COLORS } from '@/theme/colors';
import { TYPOGRAPHY } from '@/theme/typography';
import { RADIUS, SPACING } from '@/theme/spacing';

interface SvgTrendLineChartProps {
  data: number[];
  labels: string[];
  height?: number;
  strokeColor?: string;
  fillGradient?: boolean;
  targetLine?: number;
  unit?: string;
  minValue?: number;
  maxValue?: number;
}

export const SvgTrendLineChart: React.FC<SvgTrendLineChartProps> = ({
  data,
  labels,
  height = 160,
  strokeColor = '#00F0FF',
  fillGradient = true,
  targetLine,
  unit = '',
  minValue = 0,
  maxValue = 100,
}) => {
  const [containerWidth, setContainerWidth] = React.useState(
    Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md * 2
  );

  const paddingLeft = 14;
  const paddingRight = 14;
  const paddingTop = 16;
  const paddingBottom = 26;

  const chartWidth = Math.max(100, containerWidth);
  const chartHeight = height;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const nonZeroPoints = data.filter((v) => v > 0);
  const hasData = nonZeroPoints.length > 0;

  // Compute coordinates for data points
  const points = data.map((val, idx) => {
    const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * innerWidth;
    const clampedVal = Math.min(maxValue, Math.max(minValue, val));
    const normalized = (clampedVal - minValue) / Math.max(1, maxValue - minValue);
    const y = paddingTop + innerHeight - normalized * innerHeight;
    return { x, y, val };
  });

  // Build SVG path
  let linePath = '';
  let areaPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Use smooth quadratic/cubic bezier interpolation between points
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      linePath += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = paddingTop + innerHeight;
    areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  const targetY =
    targetLine !== undefined
      ? paddingTop + innerHeight - ((targetLine - minValue) / (maxValue - minValue)) * innerHeight
      : null;

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
          <LinearGradient id="lineFillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
            <Stop offset="70%" stopColor={strokeColor} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Subtle Horizontal Grid lines (25%, 50%, 75%) */}
        {[0.25, 0.5, 0.75].map((ratio) => {
          const gy = paddingTop + innerHeight * (1 - ratio);
          return (
            <Line
              key={ratio}
              x1={paddingLeft}
              y1={gy}
              x2={chartWidth - paddingRight}
              y2={gy}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}

        {/* Baseline (0) */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + innerHeight}
          x2={chartWidth - paddingRight}
          y2={paddingTop + innerHeight}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />

        {/* Target Line if specified */}
        {targetY !== null && (
          <Line
            x1={paddingLeft}
            y1={targetY}
            x2={chartWidth - paddingRight}
            y2={targetY}
            stroke={COLORS.warning}
            strokeDasharray="5 3"
            strokeWidth="1.2"
          />
        )}

        {/* Area gradient under line */}
        {fillGradient && hasData && <Path d={areaPath} fill="url(#lineFillGrad)" />}

        {/* Main curve */}
        {hasData ? (
          <Path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          /* Empty state dashed guideline */
          <Line
            x1={paddingLeft}
            y1={paddingTop + innerHeight / 2}
            x2={chartWidth - paddingRight}
            y2={paddingTop + innerHeight / 2}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeDasharray="6 4"
            strokeWidth="1.5"
          />
        )}

        {/* Dots on points */}
        {hasData &&
          points.map((pt, i) => {
            if (pt.val === 0 && nonZeroPoints.length > 1) return null;
            const isLast = i === points.length - 1;
            return (
              <G key={i}>
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isLast ? 4.5 : 3}
                  fill={isLast ? strokeColor : COLORS.background}
                  stroke={strokeColor}
                  strokeWidth="2"
                />
              </G>
            );
          })}
      </Svg>

      {/* X-axis labels below SVG */}
      <View style={[styles.labelsRow, { paddingHorizontal: paddingLeft - 4 }]}>
        {labels.map((lbl, idx) => (
          <Text
            key={idx}
            style={[
              styles.axisLabel,
              idx === labels.length - 1 && { color: strokeColor, fontWeight: '700' },
            ]}
          >
            {lbl}
          </Text>
        ))}
      </View>

      {!hasData && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>Accumulating daily logs for trend curve</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
  },
  axisLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9.5,
    color: COLORS.textMuted,
  },
  emptyOverlay: {
    position: 'absolute',
    top: '32%',
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
