import { TrainingGoal, Sex } from '@/types/coach';

export interface NutritionCalcParams {
  weightKg: number;
  heightCm: number;
  mode?: any; // Kept as optional for backwards compatibility
  goals: TrainingGoal[];
  activeCaloriesBurned: number; // e.g. from wearable sync or manual entry
  sex?: Sex;
}

export interface NutritionRecommendation {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  bmr: number;
  tdee: number;
  goalAdjustmentKcal: number;
  goalSummary: string;
  isActiveBurnFromWearable: boolean;
}

/**
 * Calculates evidence-based daily caloric targets and macronutrient distributions
 * based on body metrics (Mifflin-St Jeor), fitness telemetry (active burn),
 * biological sex metabolism characteristics, and training goal directives.
 */
export function calculateSmartNutrition(params: NutritionCalcParams): NutritionRecommendation {
  const { weightKg, heightCm, goals, activeCaloriesBurned, sex = 'male' } = params;

  if (!weightKg || weightKg <= 0 || !heightCm || heightCm <= 0) {
    return {
      dailyCalories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      bmr: 0,
      tdee: 0,
      goalAdjustmentKcal: 0,
      goalSummary: 'Weight and height required for calculation',
      isActiveBurnFromWearable: false,
    };
  }

  const validWeight = Math.max(35, Math.min(250, weightKg));
  const validHeight = Math.max(120, Math.min(230, heightCm));
  const validActiveCal = Math.max(0, Math.min(3000, activeCaloriesBurned || 0));

  // Mifflin-St Jeor BMR formula (athlete baseline ~age 28):
  // Men: 10 * weight + 6.25 * height - (5 * 28) + 5  => -135
  // Women: 10 * weight + 6.25 * height - (5 * 28) - 161 => -301
  const sexOffset = sex === 'female' ? -301 : -135;
  const bmr = Math.round(10 * validWeight + 6.25 * validHeight + sexOffset);

  // Total Daily Energy Expenditure (TDEE):
  // If active calories are reported by wearable or manual input, TDEE = BMR + Active Calories + TEF
  // Otherwise, fallback to light baseline activity multiplier (1.35 * BMR)
  const tdee =
    validActiveCal > 0
      ? Math.round(bmr + validActiveCal * 1.1)
      : Math.round(bmr * 1.35);

  let goalAdjustmentKcal = 0;
  let proteinRatio = 2.0; // g per kg bodyweight
  let fatRatio = 0.85; // g per kg bodyweight
  let goalSummary = 'Balanced Maintenance';

  const hasFatLoss = goals.includes('fat_loss_recomp');
  const hasStrength = goals.includes('strength_hypertrophy');
  const hasCardio = goals.includes('cardio_endurance');
  const hasCalisthenics = goals.includes('calisthenics_mastery');
  const hasHealth = goals.includes('daily_health_longevity');

  if (hasFatLoss && hasStrength) {
    // Body Recomposition: slight deficit, high protein
    goalAdjustmentKcal = -300;
    proteinRatio = 2.2;
    fatRatio = 0.8;
    goalSummary = 'Body Recomposition (High Protein Deficit)';
  } else if (hasFatLoss) {
    // Targeted Fat Loss: moderate deficit, high protein to spare muscle
    goalAdjustmentKcal = -400;
    proteinRatio = 2.2;
    fatRatio = 0.75;
    goalSummary = 'Fat Loss Deficit (Lean Mass Preservation)';
  } else if (hasStrength) {
    // Lean Hypertrophy: controlled caloric surplus
    goalAdjustmentKcal = 250;
    proteinRatio = 2.0;
    fatRatio = 0.9;
    goalSummary = 'Lean Hypertrophy Surplus (Muscle Growth)';
  } else if (hasCardio) {
    // Endurance: energy balance + high carb allocation
    goalAdjustmentKcal = 0;
    proteinRatio = 1.6;
    fatRatio = 0.8;
    goalSummary = 'Endurance Fueling (High Glycogen Carbs)';
  } else if (hasCalisthenics) {
    // Calisthenics Mastery: strict strength-to-weight maintenance
    goalAdjustmentKcal = 0;
    proteinRatio = 1.9;
    fatRatio = 0.85;
    goalSummary = 'Relative Strength (Strength-to-Weight Ratio)';
  } else if (hasHealth) {
    // Longevity: sustainable whole foods maintenance
    goalAdjustmentKcal = 0;
    proteinRatio = 1.6;
    fatRatio = 0.9;
    goalSummary = 'Sustainable Longevity & Vitality';
  }

  // Calculate target calories (guarded by safety floor)
  const targetCalories = Math.max(1400, tdee + goalAdjustmentKcal);

  // Calculate Protein and Fat grams
  const proteinGrams = Math.max(60, Math.round(validWeight * proteinRatio));
  const fatGrams = Math.max(40, Math.round(validWeight * fatRatio));

  // Remaining calories go to Carbohydrates: Carbs = (Total - (P*4 + F*9)) / 4
  const allocatedCalories = proteinGrams * 4 + fatGrams * 9;
  const remainingCalories = Math.max(200, targetCalories - allocatedCalories);
  const carbsGrams = Math.max(60, Math.round(remainingCalories / 4));

  // Final synced total to ensure exact macro sum
  const finalCalories = proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9;

  return {
    dailyCalories: finalCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    bmr,
    tdee,
    goalAdjustmentKcal,
    goalSummary,
    isActiveBurnFromWearable: validActiveCal > 0,
  };
}
