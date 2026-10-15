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

export const QuickPromptChips: React.FC<QuickPromptChipsProps> = ({
  onSelectPrompt,
  disabled,
}) => {
  const { mode, userProfile } = useCoachStore();
  const modeColors = getModeColors(mode);

  const chips = React.useMemo(() => {
    const isGym = userProfile.equipmentPreference === 'gym';
    const isHome = userProfile.equipmentPreference === 'home';
    const wantsCalisthenics = userProfile.primaryGoals?.includes('calisthenics_mastery');

    if (isGym && !wantsCalisthenics) {
      return [
        {
          id: 'macros',
          label: "Adjust today's macros",
          prompt: "Can you analyze today's wearable calorie burn and adjust my macro targets accordingly?",
          icon: Flame,
        },
        {
          id: 'bench',
          label: 'Bench Press form check',
          prompt: 'What cues ensure optimal bar path, scapular retraction, and leg drive on the bench press today?',
          icon: Dumbbell,
        },
        {
          id: 'overload',
          label: 'Compound overload plan',
          prompt: 'How should I progress my main compound lifts (bench, squat, row) today based on my readiness?',
          icon: Zap,
        },
        {
          id: 'recovery',
          label: 'Readiness & recovery review',
          prompt: "Break down my sleep and HRV readiness metrics from last night and give me today's plan.",
          icon: ShieldCheck,
        },
      ];
    }

    if (isHome || wantsCalisthenics) {
      return [
        {
          id: 'macros',
          label: "Adjust today's macros",
          prompt: "Can you analyze today's wearable calorie burn and adjust my macro targets accordingly?",
          icon: Flame,
        },
        {
          id: 'bw_form',
          label: 'Bodyweight form cues',
          prompt: 'What form cues should I focus on for my bodyweight push and pull exercises today?',
          icon: Dumbbell,
        },
        {
          id: 'bw_progression',
          label: 'Skill progression check',
          prompt: 'How should I progress my bodyweight holds and repetitions given my readiness?',
          icon: Zap,
        },
        {
          id: 'recovery',
          label: 'Readiness & recovery review',
          prompt: "Break down my sleep and HRV readiness metrics from last night and give me today's plan.",
          icon: ShieldCheck,
        },
      ];
    }

    // Default / Hybrid (Both Gym & Bodyweight)
    return [
      {
        id: 'macros',
        label: "Adjust today's macros",
        prompt: "Can you analyze today's wearable calorie burn and adjust my macro targets accordingly?",
        icon: Flame,
      },
      {
        id: 'exercise_form',
        label: 'Exercise form check',
        prompt: "What are the key biomechanical cues and tempo for today's primary strength movements?",
        icon: Dumbbell,
      },
      {
        id: 'overload',
        label: 'Progression & overload',
        prompt: 'How should I progress my sets, reps, and load today based on my readiness?',
        icon: Zap,
      },
      {
        id: 'recovery',
        label: 'Readiness & recovery review',
        prompt: "Break down my sleep and HRV readiness metrics from last night and give me today's plan.",
        icon: ShieldCheck,
      },
    ];
  }, [userProfile.equipmentPreference, userProfile.primaryGoals]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {chips.map((chip) => {
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
