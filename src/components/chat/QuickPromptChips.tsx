import React from 'react';
import { useCoachStore } from '@/store/useCoachStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import { HorizontalChipBar, ChipItem } from '@/components/common/HorizontalChipBar';
import { Flame, Dumbbell, Zap, ShieldCheck, Utensils } from 'lucide-react-native';

interface QuickPromptChipsProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

export const QuickPromptChips: React.FC<QuickPromptChipsProps> = ({
  onSelectPrompt,
  disabled,
}) => {
  const { userProfile } = useCoachStore();
  const { getSummaryForDate } = useNutritionStore();
  const nutritionSummary = getSummaryForDate();

  const foodPrompt = React.useMemo(() => {
    const remKcal = nutritionSummary.remainingCalories;
    const remProtein = nutritionSummary.remainingProtein;
    if (remKcal > 0) {
      return `Based on my current daily targets (${remKcal} kcal and ${remProtein}g protein remaining), what meal or whole foods should I eat next? Give exact portions and macros.`;
    }
    return `What nutrient-dense recovery food or snack do you recommend right now to optimize muscle protein synthesis and recovery?`;
  }, [nutritionSummary.remainingCalories, nutritionSummary.remainingProtein]);

  const chips: ChipItem[] = React.useMemo(() => {
    const isGym = userProfile.equipmentPreference === 'gym';
    const isHome = userProfile.equipmentPreference === 'home';
    const wantsCalisthenics = userProfile.primaryGoals?.includes('calisthenics_mastery');

    const goalName = userProfile.primaryGoals?.[0]?.replace(/_/g, ' ') || 'Strength';
    const skillLevel = userProfile.skillLevel || 'intermediate';
    const workoutPlanChip: ChipItem = {
      id: 'suggest_workout_plan',
      label: 'Suggest workout plan',
      prompt: `Coach, based on my primary goal (${goalName}), my skill level (${skillLevel.toUpperCase()}), and my current readiness score, suggest the best workout plan and split for me today. Breakdown the exercises, sets, reps, and why it fits my physiology.`,
      icon: Dumbbell,
    };

    const foodChip: ChipItem = {
      id: 'suggest_food',
      label: 'Suggest food',
      prompt: foodPrompt,
      icon: Utensils,
    };

    if (isGym && !wantsCalisthenics) {
      return [
        workoutPlanChip,
        foodChip,
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
        workoutPlanChip,
        foodChip,
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
      workoutPlanChip,
      foodChip,
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
  }, [userProfile.equipmentPreference, userProfile.primaryGoals, userProfile.skillLevel, foodPrompt]);

  return (
    <HorizontalChipBar
      items={chips}
      disabled={disabled}
      onSelect={(item) => onSelectPrompt(item.prompt || item.label)}
    />
  );
};
