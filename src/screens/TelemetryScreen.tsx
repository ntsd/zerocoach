import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useCoachStore } from '@/store/useCoachStore';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { ReadinessGauge } from '@/components/telemetry/ReadinessGauge';
import { MetricGrid } from '@/components/telemetry/MetricGrid';
import { GlassCard } from '@/components/common/GlassCard';
import {
  Activity,
  RefreshCw,
  Watch,
  UserCheck,
  Zap,
  Check,
  ShieldCheck,
} from 'lucide-react-native';

export const TelemetryScreen: React.FC = () => {
  const { metrics, syncing, syncTelemetry } = useTelemetryStore();
  const { mode, resetOnboarding } = useCoachStore();
  const modeColors = getModeColors(mode);

  const isSynced = metrics.lastSyncTimestamp > 0 && metrics.source !== 'manual';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Activity size={20} color={modeColors.accent} />
              <Text style={styles.title}>TELEMETRY DASHBOARD</Text>
            </View>
            <Text style={styles.subtitle}>
              {isSynced
                ? `Local Wearable Sync Active (${metrics.source.toUpperCase()}) • 0 Cloud Calls`
                : 'No Fitness Tracker Synced • Tap Sync Below'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => syncTelemetry()}
            disabled={syncing}
            style={[
              styles.syncHeaderBtn,
              { backgroundColor: modeColors.accent },
            ]}
            activeOpacity={0.8}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={COLORS.textDark} />
            ) : (
              <RefreshCw size={13} color={COLORS.textDark} />
            )}
            <Text style={styles.syncHeaderBtnText}>
              {syncing ? 'SYNCING...' : 'SYNC'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Wearable Providers Banner */}
        <View style={styles.providersCard}>
          <View style={styles.providerRow}>
            <Watch size={14} color={COLORS.textSecondary} />
            <Text style={styles.providerTitle}>
              DATA SOURCE: {isSynced ? metrics.source.toUpperCase() : 'NONE CONNECTED'}
            </Text>
          </View>
          <View style={styles.badgesRow}>
            <View
              style={[
                styles.badge,
                metrics.source === 'google_fit' && styles.badgeActive,
                metrics.source === 'google_fit' && { borderColor: modeColors.accent },
              ]}
            >
              <View
                style={[
                  styles.dotActive,
                  {
                    backgroundColor:
                      metrics.source === 'google_fit'
                        ? COLORS.success
                        : COLORS.textMuted,
                  },
                ]}
              />
              <Text
                style={[
                  styles.badgeText,
                  metrics.source === 'google_fit' && { color: modeColors.accent, fontWeight: '800' },
                ]}
              >
                GOOGLE FIT
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                metrics.source === 'garmin' && styles.badgeActive,
              ]}
            >
              <View
                style={[
                  styles.dotActive,
                  {
                    backgroundColor:
                      metrics.source === 'garmin'
                        ? COLORS.success
                        : COLORS.textMuted,
                  },
                ]}
              />
              <Text style={styles.badgeText}>GARMIN</Text>
            </View>

            <View
              style={[
                styles.badge,
                metrics.source === 'xiaomi' && styles.badgeActive,
              ]}
            >
              <View
                style={[
                  styles.dotActive,
                  {
                    backgroundColor:
                      metrics.source === 'xiaomi'
                        ? COLORS.success
                        : COLORS.textMuted,
                  },
                ]}
              />
              <Text style={styles.badgeText}>XIAOMI</Text>
            </View>
          </View>
        </View>

        {/* Readiness Gauge */}
        <ReadinessGauge score={metrics.readinessScore} />

        {/* Metric Cards Grid */}
        <MetricGrid metrics={metrics} />

        {/* Wearable Sync Card */}
        <GlassCard style={styles.syncBridgeCard}>
          <View style={styles.syncBridgeHeader}>
            <Zap size={18} color={modeColors.accent} />
            <Text style={styles.syncBridgeTitle}>
              {isSynced ? 'LOCAL WEARABLE BRIDGE ACTIVE' : 'CONNECT LOCAL WEARABLE'}
            </Text>
          </View>
          <Text style={styles.syncBridgeDesc}>
            {isSynced
              ? `Connected via local on-device bridge. Last refreshed ${new Date(
                  metrics.lastSyncTimestamp
                ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with zero remote API latency.`
              : 'ZeroCoach connects locally to Android Health Connect (Google Fit, Garmin, Xiaomi) with 0 cloud logins required. Syncing automatically updates your Sleep, Heart Rate, Step Count, and Active Calories.'}
          </Text>

          <TouchableOpacity
            onPress={() => syncTelemetry()}
            disabled={syncing}
            style={[styles.syncActionBtn, { backgroundColor: modeColors.accent }]}
            activeOpacity={0.85}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={COLORS.textDark} />
            ) : (
              <Zap size={16} color={COLORS.textDark} />
            )}
            <Text style={styles.syncActionBtnText}>
              {syncing ? 'Connecting Local Bridge...' : isSynced ? 'Re-sync Telemetry Now' : 'Sync Fitness App Now'}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Re-run Onboarding Button */}
        <View style={styles.onboardingResetBox}>
          <TouchableOpacity
            onPress={resetOnboarding}
            style={styles.onboardingResetBtn}
            activeOpacity={0.8}
          >
            <UserCheck size={14} color={COLORS.textMuted} />
            <Text style={styles.onboardingResetText}>
              Restart / Re-test Onboarding Flow
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  syncHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.round,
  },
  syncHeaderBtnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  providersCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  badge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  badgeActive: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  syncBridgeCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  syncBridgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBridgeTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  syncBridgeDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  syncActionBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textDark,
  },
  onboardingResetBox: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  onboardingResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  onboardingResetText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});
