import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useCoachStore } from '@/store/useCoachStore';
import {
  clearAllUserData,
  clearChatHistoryOnly,
  clearBiometricsAndProgressionsOnly,
} from '@/services/storage/userDataService';
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
  Zap,
  Check,
  ShieldCheck,
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react-native';

export const TelemetryScreen: React.FC = () => {
  const { metrics, syncing, syncError, syncTelemetry } = useTelemetryStore();
  const { mode } = useCoachStore();
  const modeColors = getModeColors(mode);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleClearChat = async () => {
    await clearChatHistoryOnly();
    setActionNotice('AI Chat conversation history cleared.');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleClearBiometrics = async () => {
    await clearBiometricsAndProgressionsOnly();
    setActionNotice('Biometrics and skill milestones cleared.');
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleConfirmClearAll = async () => {
    setIsWiping(true);
    await clearAllUserData();
    setIsWiping(false);
    setShowConfirmModal(false);
  };

  const isSynced = metrics.lastSyncTimestamp > 0 && metrics.source !== 'manual';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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

          {syncError && (
            <View style={styles.syncErrorBox}>
              <ShieldCheck size={14} color={COLORS.danger} />
              <Text style={styles.syncErrorText}>{syncError}</Text>
            </View>
          )}

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

        {/* Data Privacy & Storage Controls Card */}
        <GlassCard style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <ShieldCheck size={18} color={COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyTitle}>DATA PRIVACY & LOCAL STORAGE</Text>
              <Text style={styles.privacySubtitle}>
                100% on-device • Zero cloud tracking or logins
              </Text>
            </View>
          </View>

          <Text style={styles.privacyDesc}>
            All athlete profiles, weight/height metrics, wearable telemetry, and AI coach interactions are saved strictly on your local phone storage.
          </Text>

          {/* Action Notice feedback */}
          {actionNotice && (
            <View style={styles.noticeBox}>
              <CheckCircle2 size={13} color={COLORS.success} />
              <Text style={styles.noticeText}>{actionNotice}</Text>
            </View>
          )}

          {/* Granular Purge Controls */}
          <View style={styles.storageActionGrid}>
            <TouchableOpacity
              onPress={handleClearChat}
              style={styles.storageBtnSecondary}
              activeOpacity={0.8}
            >
              <Trash2 size={13} color={COLORS.textSecondary} />
              <Text style={styles.storageBtnSecondaryText}>Clear AI Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearBiometrics}
              style={styles.storageBtnSecondary}
              activeOpacity={0.8}
            >
              <RotateCcw size={13} color={COLORS.textSecondary} />
              <Text style={styles.storageBtnSecondaryText}>Clear Biometrics</Text>
            </TouchableOpacity>
          </View>

          {/* Master Wipe Button */}
          <TouchableOpacity
            onPress={() => setShowConfirmModal(true)}
            style={styles.wipeAllBtn}
            activeOpacity={0.85}
          >
            <AlertTriangle size={15} color={COLORS.danger} />
            <Text style={styles.wipeAllBtnText}>Clear All User Data & Reset App</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <AlertTriangle size={28} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>Clear All User Data?</Text>
            <Text style={styles.modalDesc}>
              This will permanently delete your athlete profile, body weight/height, training goals, fitness telemetry, and AI chat transcripts from this device.
            </Text>
            <Text style={styles.modalWarning}>
              You will return to the initial onboarding screen. This action cannot be undone.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmClearAll}
                disabled={isWiping}
                style={styles.modalDeleteBtn}
                activeOpacity={0.85}
              >
                {isWiping ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteText}>Yes, Clear All Data</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
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
  syncErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginVertical: SPACING.xs,
  },
  syncErrorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    flex: 1,
  },
  privacyCard: {
    marginTop: SPACING.xs,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  privacyTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.success,
    letterSpacing: 0.8,
  },
  privacySubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  privacyDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  noticeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
  },
  storageActionGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  storageBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  storageBtnSecondaryText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  wipeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginTop: 2,
  },
  wipeAllBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.danger,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    gap: SPACING.sm,
  },
  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  modalDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalWarning: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.danger,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  modalCancelText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  modalDeleteBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
  },
  modalDeleteText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: '#ffffff',
  },
});
