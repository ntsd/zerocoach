import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useTranslation } from '@/i18n';
import { COLORS, getModeColors } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { Activity, RefreshCw, Moon, Heart } from 'lucide-react-native';

export const TelemetryBanner: React.FC = () => {
  const { metrics, syncing, syncTelemetry } = useTelemetryStore();
  const { t } = useTranslation();
  const modeColors = getModeColors();

  const isSynced = metrics.lastSyncTimestamp > 0 && metrics.source !== 'manual';

  const readinessColor = isSynced
    ? metrics.readinessScore >= 80
      ? COLORS.readinessOptimal
      : metrics.readinessScore >= 60
      ? COLORS.readinessModerate
      : COLORS.readinessFatigued
    : COLORS.textMuted;

  return (
    <View style={[styles.container, { borderColor: `${modeColors.accent}30` }]}>
      <View style={styles.leftRow}>
        <View style={[styles.indicatorDot, { backgroundColor: readinessColor }]} />
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.readinessText}>
              {isSynced
                ? `${t.coach.telemetryBanner.readiness} ${metrics.readinessScore}/100`
                : t.coach.telemetryBanner.noWearable}
            </Text>
            <Text style={[styles.sourceBadge, { color: modeColors.accent }]}>
              {isSynced
                ? metrics.source.replace('_', ' ').toUpperCase()
                : t.coach.telemetryBanner.offline}
            </Text>
          </View>
          <View style={styles.metricsRow}>
            {isSynced ? (
              <>
                <View style={styles.metricItem}>
                  <Moon size={11} color={COLORS.textSecondary} />
                  <Text style={styles.metricText}>
                    {metrics.sleepHours}h {t.coach.telemetryBanner.sleep}
                  </Text>
                </View>
                <Text style={styles.divider}>•</Text>
                <View style={styles.metricItem}>
                  <Heart size={11} color={COLORS.textSecondary} />
                  <Text style={styles.metricText}>{metrics.restingHeartRate} bpm</Text>
                </View>
                <Text style={styles.divider}>•</Text>
                <View style={styles.metricItem}>
                  <Activity size={11} color={COLORS.textSecondary} />
                  <Text style={styles.metricText}>{metrics.activeCalories} kcal</Text>
                </View>
              </>
            ) : (
              <Text style={styles.metricText}>
                {t.coach.telemetryBanner.tapToSync}
              </Text>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => syncTelemetry()}
        disabled={syncing}
        style={styles.syncButton}
        activeOpacity={0.7}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={modeColors.accent} />
        ) : (
          <RefreshCw
            size={14}
            color={COLORS.textMuted}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readinessText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  sourceBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  divider: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  syncButton: {
    padding: 6,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surfaceElevated,
  },
});
