import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useCoachStore } from '@/store/useCoachStore';
import { COLORS, getModeColors } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { Flame, Dumbbell, Zap, ShieldCheck } from 'lucide-react-native';

interface QuickPromptChipsProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const CHIPS = [
  {
    id: 'macros',
    label: "Adjust today's macros",
    prompt: "Can you analyze today's wearable calorie burn and adjust my macro targets accordingly?",
    icon: Flame,
  },
  {
    id: 'lsit',
    label: 'L-Sit progression hold',
    prompt: "I'm practicing the L-sit hold today. What cues and sets should I perform given my readiness?",
    icon: Dumbbell,
  },
  {
    id: 'muscleup',
    label: 'Muscle-Up transition check',
    prompt: 'How do I master the chest-to-bar transit on the bar muscle-up without chicken-winging?',
    icon: Zap,
  },
  {
    id: 'recovery',
    label: 'Readiness & recovery review',
    prompt: "Break down my sleep and HRV readiness metrics from last night and give me today's plan.",
    icon: ShieldCheck,
  },
];

export const QuickPromptChips: React.FC<QuickPromptChipsProps> = ({
  onSelectPrompt,
  disabled,
}) => {
  const { mode } = useCoachStore();
  const modeColors = getModeColors(mode);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CHIPS.map((chip) => {
        const IconComponent = chip.icon;
        return (
          <TouchableOpacity
            key={chip.id}
            disabled={disabled}
            onPress={() => onSelectPrompt(chip.prompt)}
            style={[
              styles.chip,
              {
                borderColor: `${modeColors.accent}35`,
                backgroundColor: COLORS.cardSecondary,
              },
            ]}
            activeOpacity={0.75}
          >
            <IconComponent size={13} color={modeColors.accent} />
            <Text style={styles.chipText}>{chip.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
});
