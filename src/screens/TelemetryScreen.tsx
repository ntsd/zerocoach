import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
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
  Edit3,
  Moon,
  Heart,
  Footprints,
  Flame,
  Check,
  UserCheck,
} from 'lucide-react-native';

export const TelemetryScreen: React.FC = () => {
  const { metrics, syncing, syncTelemetry, setManualTelemetry } = useTelemetryStore();
  const { mode, resetOnboarding } = useCoachStore();
  const modeColors = getModeColors(mode);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [sleepInput, setSleepInput] = useState(metrics.sleepHours.toString());
  const [qualityInput, setQualityInput] = useState(metrics.sleepQualityScore.toString());
  const [rhrInput, setRhrInput] = useState(metrics.restingHeartRate.toString());
  const [stepsInput, setStepsInput] = useState(metrics.steps.toString());
  const [calInput, setCalInput] = useState(metrics.activeCalories.toString());

  const handleSaveManual = () => {
    setManualTelemetry({
      sleepHours: parseFloat(sleepInput) || 7.5,
      sleepQualityScore: parseInt(qualityInput, 10) || 75,
      restingHeartRate: parseInt(rhrInput, 10) || 55,
      steps: parseInt(stepsInput, 10) || 0,
      activeCalories: parseInt(calInput, 10) || 0,
    });
    setIsManualModalOpen(false);
  };

  const isManualSource = metrics.source === 'manual';

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
              {isManualSource
                ? 'Manual Biometrics Active (No Cloud Sync)'
                : 'Local Wearable Sync Active • 0 Cloud Calls'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setIsManualModalOpen(true)}
              style={[
                styles.actionBtn,
                { borderColor: `${modeColors.accent}50`, backgroundColor: `${modeColors.accent}15` },
              ]}
              activeOpacity={0.7}
            >
              <Edit3 size={14} color={modeColors.accent} />
              <Text style={[styles.actionBtnText, { color: modeColors.accent }]}>
                LOG
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => syncTelemetry()}
              disabled={syncing}
              style={[
                styles.actionBtn,
                { borderColor: 'rgba(255, 255, 255, 0.12)' },
              ]}
              activeOpacity={0.7}
            >
              <RefreshCw
                size={14}
                color={syncing ? modeColors.accent : COLORS.textPrimary}
              />
              <Text style={styles.actionBtnText}>
                {syncing ? 'SYNC...' : 'SYNC'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wearable Providers / Manual Status Banner */}
        <View style={styles.providersCard}>
          <View style={styles.providerRow}>
            <Watch size={14} color={COLORS.textSecondary} />
            <Text style={styles.providerTitle}>
              DATA SOURCE: {metrics.source.toUpperCase()}
            </Text>
          </View>
          <View style={styles.badgesRow}>
            <View
              style={[
                styles.badge,
                isManualSource && styles.badgeActive,
                isManualSource && { borderColor: modeColors.accent },
              ]}
            >
              <View
                style={[
                  styles.dotActive,
                  { backgroundColor: isManualSource ? modeColors.accent : COLORS.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.badgeText,
                  isManualSource && { color: modeColors.accent, fontWeight: '800' },
                ]}
              >
                MANUAL INPUT
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
                metrics.source === 'google_fit' && styles.badgeActive,
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
              <Text style={styles.badgeText}>GOOGLE FIT</Text>
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

        {/* Manual Telemetry Entry Card */}
        <GlassCard style={styles.manualEntryCard}>
          <View style={styles.manualHeader}>
            <Edit3 size={16} color={modeColors.accent} />
            <Text style={styles.manualTitle}>NO FITNESS APP SYNCED?</Text>
          </View>
          <Text style={styles.manualDesc}>
            You can enter your actual metrics directly without any cloud tracker. ZeroCoach will adapt all workout cues and recovery advice to your numbers:
          </Text>

          <TouchableOpacity
            onPress={() => setIsManualModalOpen(true)}
            style={[styles.openModalBtn, { backgroundColor: modeColors.accent }]}
            activeOpacity={0.8}
          >
            <Edit3 size={15} color={COLORS.textDark} />
            <Text style={styles.openModalBtnText}>Update Daily Metrics Manually</Text>
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

      {/* Manual Input Modal */}
      <Modal
        visible={isManualModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsManualModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Edit3 size={18} color={modeColors.accent} />
                <Text style={styles.modalTitle}>Manual Biometric Log</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsManualModalOpen(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Input your current physiological metrics. ZeroCoach will calculate your real-time Readiness Score immediately:
              </Text>

              {/* Sleep Hours & Quality */}
              <View style={styles.formRow}>
                <View style={styles.halfCol}>
                  <View style={styles.fieldLabelRow}>
                    <Moon size={12} color={COLORS.purpleAccent} />
                    <Text style={styles.fieldLabel}>SLEEP (HOURS)</Text>
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="decimal-pad"
                    value={sleepInput}
                    onChangeText={setSleepInput}
                    placeholder="7.5"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.halfCol}>
                  <View style={styles.fieldLabelRow}>
                    <Activity size={12} color={COLORS.warning} />
                    <Text style={styles.fieldLabel}>QUALITY (0-100)</Text>
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    value={qualityInput}
                    onChangeText={setQualityInput}
                    placeholder="80"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              {/* Resting HR & Steps */}
              <View style={[styles.formRow, { marginTop: SPACING.md }]}>
                <View style={styles.halfCol}>
                  <View style={styles.fieldLabelRow}>
                    <Heart size={12} color={COLORS.danger} />
                    <Text style={styles.fieldLabel}>RESTING HR (BPM)</Text>
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    value={rhrInput}
                    onChangeText={setRhrInput}
                    placeholder="54"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.halfCol}>
                  <View style={styles.fieldLabelRow}>
                    <Footprints size={12} color={COLORS.strict.accent} />
                    <Text style={styles.fieldLabel}>STEPS</Text>
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    value={stepsInput}
                    onChangeText={setStepsInput}
                    placeholder="8000"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              {/* Active Calories */}
              <View style={{ marginTop: SPACING.md }}>
                <View style={styles.fieldLabelRow}>
                  <Flame size={12} color={COLORS.warning} />
                  <Text style={styles.fieldLabel}>ACTIVE CALORIES BURNED (KCAL)</Text>
                </View>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  value={calInput}
                  onChangeText={setCalInput}
                  placeholder="500"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveManual}
                style={[styles.saveBtn, { backgroundColor: modeColors.accent }]}
                activeOpacity={0.8}
              >
                <Check size={16} color={COLORS.textDark} />
                <Text style={styles.saveBtnText}>Update Readiness & Save</Text>
              </TouchableOpacity>
            </ScrollView>
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
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
  },
  actionBtnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  providersCard: {
    backgroundColor: COLORS.cardSecondary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.lg,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs + 2,
  },
  providerTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  badgeActive: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  dotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textPrimary,
  },
  manualEntryCard: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  manualTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  manualDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  openModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  openModalBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textDark,
  },
  onboardingResetBox: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  onboardingResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  onboardingResetText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    padding: SPACING.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: SPACING.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfCol: {
    flex: 1,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  fieldLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  modalInput: {
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.round,
  },
  saveBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textDark,
  },
});
