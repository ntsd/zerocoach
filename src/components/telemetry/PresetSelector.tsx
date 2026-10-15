import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { TELEMETRY_PRESETS } from '@/services/telemetry/telemetryPresets';
import { TelemetryPresetId } from '@/types/telemetry';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { Sliders } from 'lucide-react-native';

export const PresetSelector: React.FC = () => {
  const { activePreset, applyPreset } = useTelemetryStore();

  const presetsList: Array<{ id: TelemetryPresetId; name: string; desc: string }> = [
    {
      id: 'optimal_recovery',
      name: 'Peak Recovery',
      desc: '8.2h Sleep • 48 bpm RHR • 78ms HRV',
    },
    {
      id: 'balanced',
      name: 'Balanced State',
      desc: '7.3h Sleep • 54 bpm RHR • 58ms HRV',
    },
    {
      id: 'high_fatigue',
      name: 'High Fatigue',
      desc: '4.8h Sleep • 64 bpm RHR • 32ms HRV',
    },
    {
      id: 'post_calisthenics',
      name: 'Post-Calisthenics',
      desc: '14.2k Steps • 920 kcal active burn',
    },
  ];

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Sliders size={15} color={COLORS.strict.accent} />
        <Text style={styles.headerText}>TELEMETRY SIMULATOR & TESTING PRESETS</Text>
      </View>
      <Text style={styles.helperText}>
        Test adaptive AI coaching logic across different physiological states without waiting for physical sleep sync:
      </Text>

      <View style={styles.buttonList}>
        {presetsList.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              onPress={() => applyPreset(preset.id)}
              style={[
                styles.presetButton,
                isActive && styles.activeButton,
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.presetContent}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.presetTitle,
                      isActive && { color: COLORS.strict.accent },
                    ]}
                  >
                    {preset.name}
                  </Text>
                  {isActive && (
                    <Text style={styles.activeTag}>ACTIVE SNAPSHOT</Text>
                  )}
                </View>
                <Text style={styles.presetDesc}>{preset.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  headerText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  helperText: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 17,
  },
  buttonList: {
    gap: SPACING.sm,
  },
  presetButton: {
    backgroundColor: COLORS.cardSecondary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  activeButton: {
    borderColor: COLORS.strict.accent,
    backgroundColor: COLORS.strict.subtle,
  },
  presetContent: {
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  activeTag: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.strict.accent,
    fontWeight: '800',
  },
  presetDesc: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
