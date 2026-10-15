import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { GlassCard } from '@/components/common/GlassCard';
import { COLORS } from '@/theme/colors';
import { fitnessBridge, HealthAvailabilityStatus } from '@/services/telemetry/fitnessBridgeService';
import {
  Watch,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Watch size={20} color="#00F0FF" />
              <Text style={styles.topBarTitle}>Fitness App Sync Bridge</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Privacy Promise Banner */}
            <View style={styles.privacyBanner}>
              <ShieldCheck size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>100% On-Device & Private</Text>
                <Text style={styles.privacySub}>
                  ZeroCoach reads your health telemetry directly from the OS. No cloud accounts, zero third-party tracking.
                </Text>
              </View>
            </View>

            {/* Provider Status Card */}
            <Text style={styles.sectionHeading}>NATIVE HEALTH ENGINE</Text>
            <GlassCard style={styles.statusCard}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#00F0FF" />
                  <Text style={styles.loadingText}>Checking local health daemons...</Text>
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
                          ? 'Android Health Connect'
                          : status?.provider === 'apple_health'
                          ? 'Apple HealthKit'
                          : 'Simulated Device Bridge'}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.statusPill,
                        status?.available ? styles.statusPillReady : styles.statusPillSim,
                      ]}
                    >
                      {status?.available ? 'ACTIVE' : 'SIMULATION READY'}
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
                        Install Health Connect (Google Play)
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </GlassCard>

            {/* Universal Supported Fitness Companion Apps */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
              UNIVERSAL FITNESS APP INTEGRATION
            </Text>
            <Text style={styles.supportedExplainer}>
              Any wearable or companion app that syncs to Android Health Connect or Apple Health works automatically with ZeroCoach:
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
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>BIOMETRICS SYNCED</Text>
            <View style={styles.metricsBox}>
              <Text style={styles.metricBullet}>• <Text style={styles.bold}>Daily Steps</Text> (00:00 to now)</Text>
              <Text style={styles.metricBullet}>• <Text style={styles.bold}>Active Energy Burned</Text> (kcal)</Text>
              <Text style={styles.metricBullet}>• <Text style={styles.bold}>Resting Heart Rate</Text> (BPM)</Text>
              <Text style={styles.metricBullet}>• <Text style={styles.bold}>Heart Rate Variability</Text> (HRV rMSSD / SDNN)</Text>
              <Text style={styles.metricBullet}>• <Text style={styles.bold}>Sleep Duration & Deep Sleep</Text> (Last session)</Text>
              <Text style={styles.metricBullet}>• <Text style={styles.bold}>Body Weight</Text> (Auto-updates Coach Nutrition Targets)</Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.bottomBarActions}>
            {status?.available ? (
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
                    <Text style={styles.primarySyncBtnText}>Sync Live Biometrics</Text>
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
                      Simulate Device Sync ({Platform.OS.toUpperCase()})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F141C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: '82%',
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
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
  bottomBarActions: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
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
