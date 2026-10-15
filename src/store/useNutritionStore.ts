import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DailyNutritionLog,
  FoodItem,
  LoggedFood,
  MealType,
  NutrientProfile,
  NutritionDailySummary,
  DAILY_RDA_TARGETS,
} from '../types/nutrition';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateNutrientsForGrams(nutrientsPer100g: NutrientProfile, grams: number): NutrientProfile {
  const ratio = Math.max(0, grams) / 100;
  return {
    calories: Math.round(nutrientsPer100g.calories * ratio),
    proteinGrams: Math.round(nutrientsPer100g.proteinGrams * ratio * 10) / 10,
    carbsGrams: Math.round(nutrientsPer100g.carbsGrams * ratio * 10) / 10,
    fatGrams: Math.round(nutrientsPer100g.fatGrams * ratio * 10) / 10,
    fiberGrams: Math.round(nutrientsPer100g.fiberGrams * ratio * 10) / 10,
    vitaminA_mcg: Math.round(nutrientsPer100g.vitaminA_mcg * ratio),
    vitaminC_mg: Math.round(nutrientsPer100g.vitaminC_mg * ratio * 10) / 10,
    vitaminD_mcg: Math.round(nutrientsPer100g.vitaminD_mcg * ratio * 10) / 10,
    vitaminB12_mcg: Math.round(nutrientsPer100g.vitaminB12_mcg * ratio * 100) / 100,
    vitaminE_mg: Math.round(nutrientsPer100g.vitaminE_mg * ratio * 10) / 10,
    iron_mg: Math.round(nutrientsPer100g.iron_mg * ratio * 10) / 10,
    calcium_mg: Math.round(nutrientsPer100g.calcium_mg * ratio),
    magnesium_mg: Math.round(nutrientsPer100g.magnesium_mg * ratio),
    potassium_mg: Math.round(nutrientsPer100g.potassium_mg * ratio),
    sodium_mg: Math.round(nutrientsPer100g.sodium_mg * ratio),
    zinc_mg: Math.round(nutrientsPer100g.zinc_mg * ratio * 10) / 10,
  };
}

export interface NutritionState {
  selectedDate: string;
  logsByDate: Record<string, DailyNutritionLog>;

  // Actions
  setSelectedDate: (date: string) => void;
  getDailyLog: (date?: string) => DailyNutritionLog;
  logFood: (
    food: FoodItem,
    mealType: MealType,
    servings: number,
    consumedGrams: number,
    date?: string
  ) => void;
  removeLoggedFood: (loggedFoodId: string, date?: string) => void;
  updateDailyTargets: (
    targets: {
      targetCalories?: number;
      targetProtein?: number;
      targetCarbs?: number;
      targetFat?: number;
      targetFiber?: number;
    },
    date?: string
  ) => void;
  getSummaryForDate: (date?: string) => NutritionDailySummary;
  clearDayLog: (date?: string) => void;
  seedDemoDayIfEmpty: () => void;
}

const DEFAULT_TARGETS = {
  targetCalories: 2450,
  targetProtein: 175,
  targetCarbs: 260,
  targetFat: 75,
  targetFiber: 35,
};

export const useNutritionStore = create<NutritionState>()(
  persist<NutritionState>(
    (set, get) => ({
      selectedDate: getTodayString(),
      logsByDate: {},

      setSelectedDate: (date: string) => set({ selectedDate: date }),

      getDailyLog: (date?: string) => {
        const targetDate = date || get().selectedDate || getTodayString();
        const existing = get().logsByDate[targetDate];
        if (existing) {
          return existing;
        }
        return {
          date: targetDate,
          ...DEFAULT_TARGETS,
          foods: [],
        };
      },

      logFood: (food, mealType, servings, consumedGrams, date) => {
        const targetDate = date || get().selectedDate || getTodayString();
        const currentLog = get().getDailyLog(targetDate);

        const calculatedNutrients = calculateNutrientsForGrams(food.nutrientsPer100g, consumedGrams);

        const newLoggedFood: LoggedFood = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          foodId: food.id,
          name: food.name,
          brand: food.brand,
          mealType,
          timestamp: Date.now(),
          servings,
          consumedGrams,
          nutrients: calculatedNutrients,
          source: food.source,
          barcode: food.barcode,
        };

        const updatedFoods = [...currentLog.foods, newLoggedFood];

        set((state) => ({
          logsByDate: {
            ...state.logsByDate,
            [targetDate]: {
              ...currentLog,
              foods: updatedFoods,
            },
          },
        }));
      },

      removeLoggedFood: (loggedFoodId, date) => {
        const targetDate = date || get().selectedDate || getTodayString();
        const currentLog = get().getDailyLog(targetDate);
        const filteredFoods = currentLog.foods.filter((f) => f.id !== loggedFoodId);

        set((state) => ({
          logsByDate: {
            ...state.logsByDate,
            [targetDate]: {
              ...currentLog,
              foods: filteredFoods,
            },
          },
        }));
      },

      updateDailyTargets: (targets, date) => {
        const targetDate = date || get().selectedDate || getTodayString();
        const currentLog = get().getDailyLog(targetDate);

        set((state) => ({
          logsByDate: {
            ...state.logsByDate,
            [targetDate]: {
              ...currentLog,
              targetCalories: targets.targetCalories ?? currentLog.targetCalories,
              targetProtein: targets.targetProtein ?? currentLog.targetProtein,
              targetCarbs: targets.targetCarbs ?? currentLog.targetCarbs,
              targetFat: targets.targetFat ?? currentLog.targetFat,
              targetFiber: targets.targetFiber ?? currentLog.targetFiber,
            },
          },
        }));
      },

      getSummaryForDate: (date) => {
        const targetDate = date || get().selectedDate || getTodayString();
        const log = get().getDailyLog(targetDate);

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let totalVitaminA_mcg = 0;
        let totalVitaminC_mg = 0;
        let totalVitaminD_mcg = 0;
        let totalVitaminB12_mcg = 0;
        let totalIron_mg = 0;
        let totalCalcium_mg = 0;
        let totalMagnesium_mg = 0;
        let totalPotassium_mg = 0;
        let totalSodium_mg = 0;
        let totalZinc_mg = 0;

        for (const f of log.foods) {
          totalCalories += f.nutrients.calories;
          totalProtein += f.nutrients.proteinGrams;
          totalCarbs += f.nutrients.carbsGrams;
          totalFat += f.nutrients.fatGrams;
          totalFiber += f.nutrients.fiberGrams;
          totalVitaminA_mcg += f.nutrients.vitaminA_mcg;
          totalVitaminC_mg += f.nutrients.vitaminC_mg;
          totalVitaminD_mcg += f.nutrients.vitaminD_mcg;
          totalVitaminB12_mcg += f.nutrients.vitaminB12_mcg;
          totalIron_mg += f.nutrients.iron_mg;
          totalCalcium_mg += f.nutrients.calcium_mg;
          totalMagnesium_mg += f.nutrients.magnesium_mg;
          totalPotassium_mg += f.nutrients.potassium_mg;
          totalSodium_mg += f.nutrients.sodium_mg;
          totalZinc_mg += f.nutrients.zinc_mg;
        }

        totalCalories = Math.round(totalCalories);
        totalProtein = Math.round(totalProtein * 10) / 10;
        totalCarbs = Math.round(totalCarbs * 10) / 10;
        totalFat = Math.round(totalFat * 10) / 10;
        totalFiber = Math.round(totalFiber * 10) / 10;
        totalVitaminA_mcg = Math.round(totalVitaminA_mcg);
        totalVitaminC_mg = Math.round(totalVitaminC_mg * 10) / 10;
        totalVitaminD_mcg = Math.round(totalVitaminD_mcg * 10) / 10;
        totalVitaminB12_mcg = Math.round(totalVitaminB12_mcg * 100) / 100;
        totalIron_mg = Math.round(totalIron_mg * 10) / 10;
        totalCalcium_mg = Math.round(totalCalcium_mg);
        totalMagnesium_mg = Math.round(totalMagnesium_mg);
        totalPotassium_mg = Math.round(totalPotassium_mg);
        totalSodium_mg = Math.round(totalSodium_mg);
        totalZinc_mg = Math.round(totalZinc_mg * 10) / 10;

        const calPct = log.targetCalories > 0 ? Math.min(100, Math.round((totalCalories / log.targetCalories) * 100)) : 0;
        const proPct = log.targetProtein > 0 ? Math.min(100, Math.round((totalProtein / log.targetProtein) * 100)) : 0;
        const carbPct = log.targetCarbs > 0 ? Math.min(100, Math.round((totalCarbs / log.targetCarbs) * 100)) : 0;
        const fatPct = log.targetFat > 0 ? Math.min(100, Math.round((totalFat / log.targetFat) * 100)) : 0;
        const fiberPct = log.targetFiber > 0 ? Math.min(100, Math.round((totalFiber / log.targetFiber) * 100)) : 0;

        return {
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat,
          totalFiber,
          totalVitaminA_mcg,
          totalVitaminC_mg,
          totalVitaminD_mcg,
          totalVitaminB12_mcg,
          totalIron_mg,
          totalCalcium_mg,
          totalMagnesium_mg,
          totalPotassium_mg,
          totalSodium_mg,
          totalZinc_mg,
          calorieProgressPercent: calPct,
          proteinProgressPercent: proPct,
          carbsProgressPercent: carbPct,
          fatProgressPercent: fatPct,
          fiberProgressPercent: fiberPct,
          remainingCalories: Math.max(0, log.targetCalories - totalCalories),
          remainingProtein: Math.max(0, Math.round((log.targetProtein - totalProtein) * 10) / 10),
        };
      },

      clearDayLog: (date) => {
        const targetDate = date || get().selectedDate || getTodayString();
        set((state) => ({
          logsByDate: {
            ...state.logsByDate,
            [targetDate]: {
              ...get().getDailyLog(targetDate),
              foods: [],
            },
          },
        }));
      },

      seedDemoDayIfEmpty: () => {
        const today = getTodayString();
        const existing = get().logsByDate[today];
        if (existing && existing.foods.length > 0) {
          return; // Already populated
        }

        // Demo sample foods with complete micronutrients
        const demoFoods: LoggedFood[] = [
          {
            id: 'demo_breakfast_1',
            foodId: 'usda_eggs_whole',
            name: 'Whole Eggs, Scrambled',
            mealType: 'breakfast',
            timestamp: Date.now() - 5 * 3600 * 1000,
            servings: 3,
            consumedGrams: 150,
            source: 'usda_bundled',
            nutrients: {
              calories: 215,
              proteinGrams: 18.9,
              carbsGrams: 1.1,
              fatGrams: 14.3,
              fiberGrams: 0,
              vitaminA_mcg: 240,
              vitaminC_mg: 0,
              vitaminD_mcg: 3.0,
              vitaminB12_mcg: 1.34,
              vitaminE_mg: 1.6,
              iron_mg: 2.6,
              calcium_mg: 84,
              magnesium_mg: 18,
              potassium_mg: 207,
              sodium_mg: 213,
              zinc_mg: 1.9,
            },
          },
          {
            id: 'demo_breakfast_2',
            foodId: 'usda_sourdough_bread',
            name: 'Artisan Sourdough Bread',
            mealType: 'breakfast',
            timestamp: Date.now() - 5 * 3600 * 1000,
            servings: 2,
            consumedGrams: 90,
            source: 'usda_bundled',
            nutrients: {
              calories: 216,
              proteinGrams: 7.2,
              carbsGrams: 43.2,
              fatGrams: 1.1,
              fiberGrams: 2.3,
              vitaminA_mcg: 0,
              vitaminC_mg: 0,
              vitaminD_mcg: 0,
              vitaminB12_mcg: 0,
              vitaminE_mg: 0.3,
              iron_mg: 2.5,
              calcium_mg: 22,
              magnesium_mg: 22,
              potassium_mg: 108,
              sodium_mg: 450,
              zinc_mg: 0.9,
            },
          },
          {
            id: 'demo_lunch_1',
            foodId: 'usda_chicken_breast',
            name: 'Chicken Breast, Grilled Boneless',
            mealType: 'lunch',
            timestamp: Date.now() - 2 * 3600 * 1000,
            servings: 1.8,
            consumedGrams: 180,
            source: 'usda_bundled',
            nutrients: {
              calories: 297,
              proteinGrams: 55.8,
              carbsGrams: 0,
              fatGrams: 6.5,
              fiberGrams: 0,
              vitaminA_mcg: 23,
              vitaminC_mg: 0,
              vitaminD_mcg: 0.2,
              vitaminB12_mcg: 0.61,
              vitaminE_mg: 0.5,
              iron_mg: 1.8,
              calcium_mg: 27,
              magnesium_mg: 52,
              potassium_mg: 461,
              sodium_mg: 133,
              zinc_mg: 1.8,
            },
          },
          {
            id: 'demo_lunch_2',
            foodId: 'usda_jasmine_rice',
            name: 'White Jasmine Rice, Cooked',
            mealType: 'lunch',
            timestamp: Date.now() - 2 * 3600 * 1000,
            servings: 1.5,
            consumedGrams: 150,
            source: 'usda_bundled',
            nutrients: {
              calories: 195,
              proteinGrams: 4.1,
              carbsGrams: 42.3,
              fatGrams: 0.5,
              fiberGrams: 0.6,
              vitaminA_mcg: 0,
              vitaminC_mg: 0,
              vitaminD_mcg: 0,
              vitaminB12_mcg: 0,
              vitaminE_mg: 0.1,
              iron_mg: 1.8,
              calcium_mg: 15,
              magnesium_mg: 18,
              potassium_mg: 53,
              sodium_mg: 2,
              zinc_mg: 0.8,
            },
          },
          {
            id: 'demo_lunch_3',
            foodId: 'usda_steamed_broccoli',
            name: 'Broccoli, Steamed Florets',
            mealType: 'lunch',
            timestamp: Date.now() - 2 * 3600 * 1000,
            servings: 1.2,
            consumedGrams: 120,
            source: 'usda_bundled',
            nutrients: {
              calories: 42,
              proteinGrams: 3.4,
              carbsGrams: 8.4,
              fatGrams: 0.5,
              fiberGrams: 3.1,
              vitaminA_mcg: 37,
              vitaminC_mg: 78.0,
              vitaminD_mcg: 0,
              vitaminB12_mcg: 0,
              vitaminE_mg: 1.0,
              iron_mg: 0.8,
              calcium_mg: 48,
              magnesium_mg: 25,
              potassium_mg: 380,
              sodium_mg: 49,
              zinc_mg: 0.5,
            },
          },
        ];

        set((state) => ({
          logsByDate: {
            ...state.logsByDate,
            [today]: {
              date: today,
              ...DEFAULT_TARGETS,
              foods: demoFoods,
            },
          },
        }));
      },
    }),
    {
      name: 'zerocoach-nutrition-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
