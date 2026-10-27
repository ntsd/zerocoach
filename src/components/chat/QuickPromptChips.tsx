import React from 'react';
import { useCoachStore } from '@/store/useCoachStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import { useTranslation } from '@/i18n';
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
  const { t, language } = useTranslation();
  const nutritionSummary = getSummaryForDate();

  const foodPrompt = React.useMemo(() => {
    const remKcal = nutritionSummary.remainingCalories;
    const remProtein = nutritionSummary.remainingProtein;
    if (remKcal > 0) {
      return t.coach.quickPrompts.foodPromptWithKcal
        .replace('{kcal}', String(remKcal))
        .replace('{protein}', String(remProtein));
    }
    return t.coach.quickPrompts.foodPromptGeneral;
  }, [nutritionSummary.remainingCalories, nutritionSummary.remainingProtein, t]);

  const chips: ChipItem[] = React.useMemo(() => {
    const isGym = userProfile.equipmentPreference === 'gym';
    const isHome = userProfile.equipmentPreference === 'home';
    const wantsCalisthenics = userProfile.primaryGoals?.includes('calisthenics_mastery');

    const workoutPlanChip: ChipItem = {
      id: 'suggest_workout_plan',
      label: t.coach.quickPrompts.workoutPlan,
      prompt: t.coach.quickPrompts.workoutPlanPrompt,
      icon: Dumbbell,
    };

    const foodChip: ChipItem = {
      id: 'suggest_food',
      label: t.coach.quickPrompts.food,
      prompt: foodPrompt,
      icon: Utensils,
    };

    if (isGym && !wantsCalisthenics) {
      return [
        workoutPlanChip,
        foodChip,
        {
          id: 'macros',
          label: t.coach.quickPrompts.macros,
          prompt: t.coach.quickPrompts.macrosPrompt,
          icon: Flame,
        },
        {
          id: 'bench',
          label: t.coach.quickPrompts.bench,
          prompt: t.coach.quickPrompts.benchPrompt,
          icon: Dumbbell,
        },
        {
          id: 'overload',
          label: t.coach.quickPrompts.overload,
          prompt: t.coach.quickPrompts.overloadPrompt,
          icon: Zap,
        },
        {
          id: 'recovery',
          label: t.coach.quickPrompts.recovery,
          prompt: t.coach.quickPrompts.recoveryPrompt,
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
          label: t.coach.quickPrompts.macros,
          prompt: t.coach.quickPrompts.macrosPrompt,
          icon: Flame,
        },
        {
          id: 'bw_progression',
          label: t.coach.quickPrompts.calisthenics,
          prompt: t.coach.quickPrompts.calisthenicsPrompt,
          icon: Zap,
        },
        {
          id: 'recovery',
          label: t.coach.quickPrompts.recovery,
          prompt: t.coach.quickPrompts.recoveryPrompt,
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
        label: t.coach.quickPrompts.macros,
        prompt: t.coach.quickPrompts.macrosPrompt,
        icon: Flame,
      },
      {
        id: 'overload',
        label: t.coach.quickPrompts.overload,
        prompt: t.coach.quickPrompts.overloadPrompt,
        icon: Zap,
      },
      {
        id: 'recovery',
        label: t.coach.quickPrompts.recovery,
        prompt: t.coach.quickPrompts.recoveryPrompt,
        icon: ShieldCheck,
      },
    ];
  }, [userProfile.equipmentPreference, userProfile.primaryGoals, foodPrompt, t]);

  return (
    <HorizontalChipBar
      items={chips}
      disabled={disabled}
      onSelect={(item) => onSelectPrompt(item.prompt || item.label)}
    />
  );
};
