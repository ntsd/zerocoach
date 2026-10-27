import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCoachStore } from '@/store/useCoachStore';
import { useTranslation } from '@/i18n';
import { COLORS, getModeColors } from '@/theme/colors';
import { TYPOGRAPHY } from '@/theme/typography';
import { RADIUS, SPACING } from '@/theme/spacing';
import { ZeroCoachLogo } from '@/components/common/ZeroCoachLogo';

import { llmService } from '@/services/llm/llmService';

interface StreamingIndicatorProps {
  tokenCount?: number;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = () => {
  const { mode } = useCoachStore();
  const { t } = useTranslation();
  const modeColors = getModeColors(mode);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => !p);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const engineType = llmService.getActiveEngineName();
  const engineLabel =
    engineType === 'gemini'
      ? 'GOOGLE GEMINI STREAMING'
      : engineType === 'openai'
      ? 'OPENAI STREAMING'
      : engineType === 'on_device'
      ? t.coach.onDeviceStreaming
      : 'SOVEREIGN STREAMING (~38 tok/s)';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.glowDot,
          {
            backgroundColor: modeColors.accent,
            opacity: pulse ? 1 : 0.35,
            shadowColor: modeColors.accent,
          },
        ]}
      />
      <ZeroCoachLogo size={13} mode={mode} />
      <Text style={[styles.text, { color: modeColors.accent }]}>
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
