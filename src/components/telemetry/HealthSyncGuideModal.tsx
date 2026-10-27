import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AppModal } from '@/components/common/AppModal';
import { GlassCard } from '@/components/common/GlassCard';
import { COLORS } from '@/theme/colors';
import { fitnessBridge, HealthAvailabilityStatus } from '@/services/telemetry/fitnessBridgeService';
import { useTranslation } from '@/i18n';
import {
  Watch,
  Activity,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Smartphone,
  Zap,
} from 'lucide-react-native';

interface HealthSyncGuideModalProps {
  visible: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
  onTriggerSync: () => Promise<void>;
}

const SUPPORTED_APPS = [
  { name: 'Garmin', desc: 'Garmin Connect' },
  { name: 'Apple Watch', desc: 'Apple Health' },
  { name: 'Samsung', desc: 'Samsung Health' },
  { name: 'Whoop', desc: 'Whoop 4.0' },
  { name: 'Oura', desc: 'Oura Ring' },
  { name: 'Pixel / Fit', desc: 'Google Fit' },
  { name: 'Strava', desc: 'Activities' },
  { name: 'Xiaomi', desc: 'Mi Fitness' },
];

export const HealthSyncGuideModal: React.FC<HealthSyncGuideModalProps> = ({
  visible,
  onClose,
  onSyncSuccess,
  onTriggerSync,
}) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<HealthAvailabilityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (visible) {
      checkStatus();
    }
  }, [visible]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fitnessBridge.checkAvailability();
      setStatus(res);
    } catch {
      setStatus({
        available: false,
        provider: 'simulation',
        message: 'Could not query health provider status.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermissions = async () => {
    setSyncing(true);
    try {
      await fitnessBridge.requestPermissions();
      await onTriggerSync();
      onSyncSuccess?.();
      onClose();
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSimulateSync = async () => {
    setSyncing(true);
    try {
      await onTriggerSync();
      onSyncSuccess?.();
      onClose();
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenSettings = async () => {
    await fitnessBridge.openHealthSettings();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={t.analyze.healthGuideModal.title}
      icon={Watch}
      iconColor="#00F0FF"
      height="85%"
      footer={
        status?.available ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.primarySyncBtn}
            onPress={handleGrantPermissions}
            activeOpacity={0.8}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#080B10" />
            ) : (
              <>
                <Zap size={18} color="#080B10" />
                <Text style={styles.primarySyncBtnText}>{t.analyze.healthGuideModal.syncLive}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.primarySyncBtn}
            onPress={handleSimulateSync}
            activeOpacity={0.8}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#080B10" />
            ) : (
              <>
                <Sparkles size={18} color="#080B10" />
                <Text style={styles.primarySyncBtnText}>
                  {t.analyze.healthGuideModal.simulateSync.replace('{os}', Platform.OS.toUpperCase())}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )
      }
    >
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Promise Banner */}
        <View style={styles.privacyBanner}>
          <ShieldCheck size={18} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>{t.analyze.healthGuideModal.privacyTitle}</Text>
            <Text style={styles.privacySub}>
              {t.analyze.healthGuideModal.privacySub}
            </Text>
          </View>
        </View>

        {/* Provider Status Card */}
        <Text style={styles.sectionHeading}>{t.analyze.healthGuideModal.nativeEngine}</Text>
        <GlassCard style={styles.statusCard}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#00F0FF" />
              <Text style={styles.loadingText}>{t.analyze.healthGuideModal.checkingStatus}</Text>
            </View>
          ) : (
            <>
              <View style={styles.statusHeaderRow}>
                <View style={styles.statusBadge}>
                  {status?.available ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : (
                    <Smartphone size={16} color="#38BDF8" />
                  )}
                  <Text style={styles.statusBadgeText}>
                    {status?.provider === 'health_connect'
                      ? t.analyze.healthGuideModal.androidHealthConnect
                      : status?.provider === 'apple_health'
                      ? t.analyze.healthGuideModal.appleHealthKit
                      : t.analyze.healthGuideModal.simulatedBridge}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.statusPill,
                    status?.available ? styles.statusPillReady : styles.statusPillSim,
                  ]}
                >
                  {status?.available ? t.analyze.healthGuideModal.active : t.analyze.healthGuideModal.simReady}
                </Text>
              </View>

              <Text style={styles.statusMessage}>{status?.message}</Text>

              {status?.requiresInstall && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.installButton}
                  onPress={handleOpenSettings}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={14} color="#080B10" />
                  <Text style={styles.installButtonText}>
                    {t.analyze.healthGuideModal.installHealthConnect}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </GlassCard>

        {/* Universal Supported Fitness Companion Apps */}
        <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
          {t.analyze.healthGuideModal.universalIntegration}
        </Text>
        <Text style={styles.supportedExplainer}>
          {t.analyze.healthGuideModal.supportedExplainer}
        </Text>

        <View style={styles.appsGrid}>
          {SUPPORTED_APPS.map((app) => (
            <View key={app.name} style={styles.appCard}>
              <Activity size={14} color="#00F0FF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={styles.appDesc}>{app.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Metrics Synced List */}
        <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
          {t.analyze.healthGuideModal.biometricsSynced}
        </Text>
        <View style={styles.metricsBox}>
          <Text style={styles.metricBullet}>• <Text style={styles.bold}>{t.analyze.healthGuideModal.metrics.steps}</Text> {t.analyze.healthGuideModal.metrics.stepsDesc}</Text>
          <Text style={styles.metricBullet}>• <Text style={styles.bold}>{t.analyze.healthGuideModal.metrics.calories}</Text> {t.analyze.healthGuideModal.metrics.caloriesDesc}</Text>
          <Text style={styles.metricBullet}>• <Text style={styles.bold}>{t.analyze.healthGuideModal.metrics.hr}</Text> {t.analyze.healthGuideModal.metrics.hrDesc}</Text>
          <Text style={styles.metricBullet}>• <Text style={styles.bold}>{t.analyze.healthGuideModal.metrics.hrv}</Text> {t.analyze.healthGuideModal.metrics.hrvDesc}</Text>
          <Text style={styles.metricBullet}>• <Text style={styles.bold}>{t.analyze.healthGuideModal.metrics.sleep}</Text> {t.analyze.healthGuideModal.metrics.sleepDesc}</Text>
          <Text style={styles.metricBullet}>• <Text style={styles.bold}>{t.analyze.healthGuideModal.metrics.weight}</Text> {t.analyze.healthGuideModal.metrics.weightDesc}</Text>
        </View>
      </ScrollView>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  privacyTitle: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  privacySub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionHeading: {
    color: COLORS.strict.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusCard: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
  },
  statusPillSim: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    color: '#00F0FF',
  },
  statusMessage: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00F0FF',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  installButtonText: {
    color: '#080B10',
    fontSize: 12,
    fontWeight: '700',
  },
  supportedExplainer: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 15,
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  appCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  appDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  metricsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 16,
  },
  metricBullet: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  bold: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  primarySyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00F0FF',
    borderRadius: 14,
    paddingVertical: 14,
  },
  primarySyncBtnText: {
    color: '#080B10',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
