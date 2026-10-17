export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodSource = 'usda_bundled' | 'open_food_facts' | 'ai_decomposed' | 'custom';

export type FoodCategory =
  | 'meat_poultry'
  | 'fish_seafood'
  | 'eggs_dairy'
  | 'grains_bread'
  | 'fruits'
  | 'vegetables'
  | 'legumes_nuts'
  | 'beverages'
  | 'packaged_goods'
  | 'prepared_meal';

export interface MicronutrientProfile {
  // Fiber (grams)
  fiberGrams: number;

  // Key Vitamins
  vitaminA_mcg: number; // Retinol/Beta-Carotene (RDA ~900mcg)
  vitaminC_mg: number;  // Ascorbic acid (RDA ~90mg)
  vitaminD_mcg: number; // Calciferol (RDA ~15mcg / 600 IU)
  vitaminB12_mcg: number; // Cobalamin (RDA ~2.4mcg)
  vitaminE_mg: number;  // Alpha-tocopherol (RDA ~15mg)

  // Key Minerals
  iron_mg: number;      // (RDA ~8-18mg)
  calcium_mg: number;   // (RDA ~1000mg)
  magnesium_mg: number; // (RDA ~400mg)
  potassium_mg: number; // (RDA ~3400mg)
  sodium_mg: number;    // (Daily Limit ~2300mg)
  zinc_mg: number;      // (RDA ~11mg)
}

export interface NutrientProfile extends MicronutrientProfile {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  category: FoodCategory;
  servingSizeGrams: number; // baseline e.g. 100g, or product serving size
  servingUnitName: string; // e.g. "100g", "1 medium (120g)", "330 ml", "1 scoop (30g)"
  nutrientsPer100g: NutrientProfile;
  source: FoodSource;
  barcode?: string;
  imageUrl?: string;
  hasCompleteMicros: boolean;
  packageQuantityGrams?: number;
  packageQuantityUnitName?: string;
  servingQuantityGrams?: number;
  offQuantity?: string;
}

export interface LoggedFood {
  id: string;
  foodId: string;
  name: string;
  brand?: string;
  mealType: MealType;
  timestamp: number;
  servings: number;
  consumedGrams: number;
  nutrients: NutrientProfile;
  source: FoodSource;
  barcode?: string;
  packageQuantityGrams?: number;
  packageQuantityUnitName?: string;
  servingQuantityGrams?: number;
  offQuantity?: string;
}

export interface DailyNutritionLog {
  date: string; // YYYY-MM-DD
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  foods: LoggedFood[];
}

export interface NutritionDailySummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalVitaminA_mcg: number;
  totalVitaminC_mg: number;
  totalVitaminD_mcg: number;
  totalVitaminB12_mcg: number;
  totalIron_mg: number;
  totalCalcium_mg: number;
  totalMagnesium_mg: number;
  totalPotassium_mg: number;
  totalSodium_mg: number;
  totalZinc_mg: number;
  calorieProgressPercent: number;
  proteinProgressPercent: number;
  carbsProgressPercent: number;
  fatProgressPercent: number;
  fiberProgressPercent: number;
  remainingCalories: number;
  remainingProtein: number;
}

// Recommended Dietary Allowance standard baseline (adult athlete)
export const DAILY_RDA_TARGETS = {
  fiberGrams: 30, // 28-38g depending on calorie scale
  vitaminA_mcg: 900,
  vitaminC_mg: 90,
  vitaminD_mcg: 15,
  vitaminB12_mcg: 2.4,
  vitaminE_mg: 15,
  iron_mg: 14,
  calcium_mg: 1000,
  magnesium_mg: 400,
  potassium_mg: 3400,
  sodium_mg_limit: 2300,
  zinc_mg: 11,
};
