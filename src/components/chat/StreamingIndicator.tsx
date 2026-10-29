import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCoachStore } from '@/store/useCoachStore';
import { useChatStore } from '@/store/useChatStore';
import { useTranslation } from '@/i18n';
import { COLORS, getModeColors } from '@/theme/colors';
import { TYPOGRAPHY } from '@/theme/typography';
import { RADIUS, SPACING } from '@/theme/spacing';
import { ZeroCoachLogo } from '@/components/common/ZeroCoachLogo';
import { Zap } from 'lucide-react-native';
import { llmService } from '@/services/llm/llmService';

interface StreamingIndicatorProps {
  tokenCount?: number;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = () => {
  const { mode } = useCoachStore();
  const activeSteps = useChatStore((s) => s.activeSteps);
  const { t } = useTranslation();
  const modeColors = getModeColors(mode);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => !p);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const runningStep = activeSteps?.find((s) => s.status === 'running') || activeSteps?.[activeSteps.length - 1];

  const engineType = llmService.getActiveEngineName();
  const activeModel = llmService.getActiveModelName();
  const engineLabel = runningStep
    ? `HARNESS: ${runningStep.summary.toUpperCase()}`
    : engineType === 'gemini'
    ? 'GEMINI 2.5 FLASH STREAMING'
    : engineType === 'openai'
    ? `${activeModel.toUpperCase()} STREAMING`
    : engineType === 'on_device'
    ? `${activeModel.toUpperCase()} (METAL/GPU)`
    : `${activeModel.toUpperCase()} STREAMING`;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.glowDot,
          {
            backgroundColor: runningStep ? '#00F0FF' : modeColors.accent,
            opacity: pulse ? 1 : 0.35,
            shadowColor: runningStep ? '#00F0FF' : modeColors.accent,
          },
        ]}
      />
      {runningStep ? (
        <Zap size={13} color="#00F0FF" />
      ) : (
        <ZeroCoachLogo size={13} mode={mode} />
      )}
      <Text
        style={[
          styles.text,
          { color: runningStep ? '#00F0FF' : modeColors.accent },
        ]}
        numberOfLines={1}
      >
        {engineLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 4,
    marginBottom: 4,
  },
  glowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '700',
  },
});
