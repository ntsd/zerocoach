import React from 'react';
import { useCoachStore } from '@/store/useCoachStore';
import { HorizontalChipBar, ChipItem } from '@/components/common/HorizontalChipBar';
import { Flame, Dumbbell, Zap, ShieldCheck } from 'lucide-react-native';

interface QuickPromptChipsProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

export const QuickPromptChips: React.FC<QuickPromptChipsProps> = ({
  onSelectPrompt,
  disabled,
}) => {
  const { userProfile } = useCoachStore();

  const chips: ChipItem[] = React.useMemo(() => {
    const isGym = userProfile.equipmentPreference === 'gym';
    const isHome = userProfile.equipmentPreference === 'home';
    const wantsCalisthenics = userProfile.primaryGoals?.includes('calisthenics_mastery');

    if (isGym && !wantsCalisthenics) {
      return [
        {
          id: 'macros',
          label: 'Adjust macros',
          prompt: "Can you analyze today's wearable calorie burn and adjust my macro targets accordingly?",
          icon: Flame,
        },
        {
          id: 'bench',
          label: 'Bench cues',
          prompt: 'What cues ensure optimal bar path, scapular retraction, and leg drive on the bench press today?',
          icon: Dumbbell,
        },
        {
          id: 'overload',
          label: 'Overload plan',
          prompt: 'How should I progress my main compound lifts (bench, squat, row) today based on my readiness?',
          icon: Zap,
        },
        {
          id: 'recovery',
          label: 'Readiness review',
          prompt: "Break down my sleep and HRV readiness metrics from last night and give me today's plan.",
          icon: ShieldCheck,
        },
      ];
    }

    if (isHome || wantsCalisthenics) {
      return [
        {
          id: 'macros',
          label: 'Adjust macros',
          prompt: "Can you analyze today's wearable calorie burn and adjust my macro targets accordingly?",
          icon: Flame,
        },
        {
          id: 'bw_form',
          label: 'Bodyweight cues',
          prompt: 'What form cues should I focus on for my bodyweight push and pull exercises today?',
          icon: Dumbbell,
        },
        {
          id: 'bw_progression',
          label: 'Skill check',
          prompt: 'How should I progress my bodyweight holds and repetitions given my readiness?',
          icon: Zap,
        },
        {
          id: 'recovery',
          label: 'Readiness review',
          prompt: "Break down my sleep and HRV readiness metrics from last night and give me today's plan.",
          icon: ShieldCheck,
        },
      ];
    }

    // Default / Hybrid (Both Gym & Bodyweight)
    return [
      {
        id: 'macros',
        label: 'Adjust macros',
        prompt: "Can you analyze today's wearable calorie burn and adjust my macro targets accordingly?",
        icon: Flame,
      },
      {
        id: 'exercise_form',
        label: 'Form cues',
        prompt: "What are the key biomechanical cues and tempo for today's primary strength movements?",
        icon: Dumbbell,
      },
      {
        id: 'overload',
        label: 'Overload plan',
        prompt: 'How should I progress my sets, reps, and load today based on my readiness?',
        icon: Zap,
      },
      {
        id: 'recovery',
        label: 'Readiness review',
        prompt: "Break down my sleep and HRV readiness metrics from last night and give me today's plan.",
        icon: ShieldCheck,
      },
    ];
  }, [userProfile.equipmentPreference, userProfile.primaryGoals]);

  return (
    <HorizontalChipBar
      items={chips}
      disabled={disabled}
      onSelect={(item) => onSelectPrompt(item.prompt || item.label)}
    />
  );
};
