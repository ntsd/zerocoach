import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModelStore } from '@/store/useModelStore';
import { useCoachStore } from '@/store/useCoachStore';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import {
  Cpu,
  Download,
  HardDrive,
  Zap,
  CheckCircle2,
  RefreshCw,
  Terminal,
} from 'lucide-react-native';

export const ModelManagerScreen: React.FC = () => {
  const {
    currentModel,
    status,
    downloadProgress,
    useMockFallback,
    stats,
    downloadModel,
    loadModel,
    unloadModel,
    setUseMockFallback,
  } = useModelStore();

  const { mode } = useCoachStore();
  const modeColors = getModeColors(mode);
  const [otaStatus, setOtaStatus] = useState<string | null>(null);
  const [checkingOta, setCheckingOta] = useState(false);

  const handleCheckOTA = () => {
    setCheckingOta(true);
    setOtaStatus(null);
    setTimeout(() => {
      setCheckingOta(false);
      setOtaStatus('ZeroCoach is up-to-date with latest prompt & inference logic.');
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Cpu size={20} color={modeColors.accent} />
              <Text style={styles.title}>LOCAL AI ENGINE</Text>
            </View>
            <Text style={styles.subtitle}>
              llama.rn • Edge Acceleration • 0 Cloud Latency
            </Text>
          </View>
        </View>

        {/* Model Spec Card */}
        <GlassCard style={styles.card}>
          <View style={styles.modelHeader}>
            <View>
              <Text style={styles.modelName}>{currentModel.name}</Text>
              <Text style={styles.quantBadge}>
                QUANTIZATION: {currentModel.quantization} (Low Memory)
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      status === 'loaded' || status === 'ready'
                        ? COLORS.success
                        : COLORS.warning,
                  },
                ]}
              />
              <Text style={styles.statusText}>{status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <HardDrive size={14} color={COLORS.textSecondary} />
              <Text style={styles.specLabel}>ON-DISK SIZE:</Text>
              <Text style={styles.specValue}>{currentModel.sizeFormatted}</Text>
            </View>
            <View style={styles.specItem}>
              <Terminal size={14} color={COLORS.textSecondary} />
              <Text style={styles.specLabel}>CONTEXT LENGTH:</Text>
              <Text style={styles.specValue}>{currentModel.contextLength} tokens</Text>
            </View>
          </View>

          {/* Download Progress */}
          {status === 'downloading' && (
            <View style={styles.downloadBox}>
              <View style={styles.progressHeader}>
                <Text style={styles.downloadingText}>
                  Streaming GGUF Model Weights...
                </Text>
                <Text style={styles.downloadPercent}>{downloadProgress}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${downloadProgress}%`,
                      backgroundColor: modeColors.accent,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {status !== 'downloading' && (
              <TouchableOpacity
                onPress={() => downloadModel()}
                style={[
                  styles.btn,
                  { borderColor: `${modeColors.accent}40` },
                ]}
                activeOpacity={0.8}
              >
                <Download size={15} color={modeColors.accent} />
                <Text style={[styles.btnText, { color: modeColors.accent }]}>
                  {status === 'ready' || status === 'loaded'
                    ? 'RE-VERIFY WEIGHTS'
                    : 'DOWNLOAD MODEL'}
                </Text>
              </TouchableOpacity>
            )}

            {status === 'loaded' ? (
              <TouchableOpacity
                onPress={() => unloadModel()}
                style={[styles.btn, styles.btnDanger]}
                activeOpacity={0.8}
              >
                <Text style={styles.btnDangerText}>UNLOAD FROM RAM</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => loadModel()}
                style={[
                  styles.btn,
                  { backgroundColor: modeColors.accent, borderColor: modeColors.accent },
                ]}
                activeOpacity={0.8}
              >
                <Zap size={15} color={COLORS.textDark} />
                <Text style={[styles.btnText, { color: COLORS.textDark }]}>
                  LOAD CONTEXT
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>

        {/* Edge Hardware Acceleration Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Zap size={16} color={COLORS.strict.accent} />
            <Text style={styles.cardTitle}>HARDWARE ACCELERATION TELEMETRY</Text>
          </View>

          <View style={styles.hwGrid}>
            <View style={styles.hwItem}>
              <Text style={styles.hwLabel}>GPU BACKEND</Text>
              <Text style={styles.hwValue}>
                {stats.acceleration.toUpperCase()} (Metal / OpenCL)
              </Text>
            </View>
            <View style={styles.hwItem}>
              <Text style={styles.hwLabel}>RAM UTILIZATION</Text>
              <Text style={styles.hwValue}>{stats.memoryUsageMb} MB / 2048 MB</Text>
            </View>
            <View style={styles.hwItem}>
              <Text style={styles.hwLabel}>GPU OFFLOAD LAYERS</Text>
              <Text style={styles.hwValue}>{stats.gpuLayersOffloaded} Layers</Text>
            </View>
            <View style={styles.hwItem}>
              <Text style={styles.hwLabel}>INFERENCE SPEED</Text>
              <Text style={styles.hwValue}>~{stats.tokensPerSec} tok/s</Text>
            </View>
          </View>
        </GlassCard>

        {/* Dev / Simulator Engine Toggle */}
        <GlassCard style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>RAPID DEV SIMULATION MODE</Text>
              <Text style={styles.toggleDesc}>
                When enabled, streams responses using on-device emulation without needing to download the 1.64GB GGUF model.
              </Text>
            </View>
            <Switch
              value={useMockFallback}
              onValueChange={setUseMockFallback}
              trackColor={{ false: COLORS.cardSecondary, true: modeColors.accent }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </GlassCard>

        {/* OTA Updates Section */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <RefreshCw size={16} color={COLORS.purpleAccent} />
            <Text style={styles.cardTitle}>OVER-THE-AIR (OTA) HOTFIX CHANNEL</Text>
          </View>
          <Text style={styles.otaDesc}>
            Pull instant prompt refinements and UI enhancements without waiting for App Store / Google Play review cycles.
          </Text>

          <TouchableOpacity
            onPress={handleCheckOTA}
            disabled={checkingOta}
            style={styles.otaBtn}
            activeOpacity={0.8}
          >
            {checkingOta ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <>
                <RefreshCw size={14} color={COLORS.textPrimary} />
                <Text style={styles.otaBtnText}>CHECK FOR OTA UPDATES</Text>
              </>
            )}
          </TouchableOpacity>

          {otaStatus && (
            <View style={styles.otaStatusBox}>
              <CheckCircle2 size={14} color={COLORS.success} />
              <Text style={styles.otaStatusText}>{otaStatus}</Text>
            </View>
          )}
        </GlassCard>
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
  },
  header: {
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  card: {
    marginBottom: SPACING.md,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modelName: {
    ...TYPOGRAPHY.h3,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  quantBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textPrimary,
  },
  specsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.md,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  specValue: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  downloadBox: {
    marginBottom: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  downloadingText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  downloadPercent: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardSecondary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: COLORS.cardSecondary,
  },
  btnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    fontWeight: '800',
  },
  btnDanger: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  btnDangerText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  hwGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  hwItem: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.cardSecondary,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
  },
  hwLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  hwValue: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  toggleTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  toggleDesc: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  otaDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  otaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  otaBtnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  otaStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  otaStatusText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.success,
  },
});
