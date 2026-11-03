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
    sugarGrams: Math.round((nutrientsPer100g.sugarGrams || 0) * ratio * 10) / 10,
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
  updateLoggedFoodGrams: (
    loggedFoodId: string,
    newGrams: number,
    date?: string
  ) => void;
  updateLoggedFoodIngredientGrams: (
    loggedFoodId: string,
    ingredientIndex: number,
    deltaGrams: number,
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
        let existing = get().logsByDate[targetDate];

        // Self-heal: If targetDate is today and has no foods, check if foods were saved under tomorrow
        const todayStr = getTodayString();
        if (targetDate === todayStr && (!existing || existing.foods.length === 0)) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
          const tomorrowLog = get().logsByDate[tomorrowStr];

          if (tomorrowLog && tomorrowLog.foods.length > 0) {
            const now = Date.now();
            const foodsToMove = tomorrowLog.foods.filter((f) => f.timestamp <= now + 60000);
            if (foodsToMove.length > 0) {
              const healedLog: DailyNutritionLog = {
                date: todayStr,
                targetCalories: tomorrowLog.targetCalories || DEFAULT_TARGETS.targetCalories,
                targetProtein: tomorrowLog.targetProtein || DEFAULT_TARGETS.targetProtein,
                targetCarbs: tomorrowLog.targetCarbs || DEFAULT_TARGETS.targetCarbs,
                targetFat: tomorrowLog.targetFat || DEFAULT_TARGETS.targetFat,
                targetFiber: tomorrowLog.targetFiber || DEFAULT_TARGETS.targetFiber,
                foods: foodsToMove,
              };
              set((state) => ({
                selectedDate: todayStr,
                logsByDate: {
                  ...state.logsByDate,
                  [todayStr]: healedLog,
                  [tomorrowStr]: {
                    ...tomorrowLog,
                    foods: tomorrowLog.foods.filter((f) => f.timestamp > now + 60000),
                  },
                },
              }));
              existing = healedLog;
            }
          }
        }

        if (existing) {
          const nonDemoFoods = existing.foods.filter((f) => !f.id.startsWith('demo_'));
          return {
            ...existing,
            foods: nonDemoFoods,
          };
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
        const baseServingGrams = Math.max(1, food.servingSizeGrams || 100);
        const ingredientScale = consumedGrams / baseServingGrams;

        const scaledDecomposedIngredients = food.decomposedIngredients
          ? food.decomposedIngredients.map((ing) => {
              const oldGrams = Math.max(1, ing.quantityGrams);
              const nextGrams = Math.max(1, Math.round(ing.quantityGrams * ingredientScale));
              const ratio = nextGrams / oldGrams;
              return {
                ...ing,
                quantityGrams: nextGrams,
                nutrients: {
                  calories: Math.round(ing.nutrients.calories * ratio),
                  proteinGrams: Math.round(ing.nutrients.proteinGrams * ratio * 10) / 10,
                  carbsGrams: Math.round(ing.nutrients.carbsGrams * ratio * 10) / 10,
                  fatGrams: Math.round(ing.nutrients.fatGrams * ratio * 10) / 10,
                  fiberGrams: Math.round(ing.nutrients.fiberGrams * ratio * 10) / 10,
                  sugarGrams: Math.round((ing.nutrients.sugarGrams || 0) * ratio * 10) / 10,
                  vitaminA_mcg: Math.round(ing.nutrients.vitaminA_mcg * ratio),
                  vitaminC_mg: Math.round(ing.nutrients.vitaminC_mg * ratio * 10) / 10,
                  vitaminD_mcg: Math.round(ing.nutrients.vitaminD_mcg * ratio * 10) / 10,
                  vitaminB12_mcg: Math.round(ing.nutrients.vitaminB12_mcg * ratio * 100) / 100,
                  vitaminE_mg: Math.round((ing.nutrients.vitaminE_mg || 0) * ratio * 10) / 10,
                  iron_mg: Math.round(ing.nutrients.iron_mg * ratio * 10) / 10,
                  calcium_mg: Math.round(ing.nutrients.calcium_mg * ratio),
                  magnesium_mg: Math.round(ing.nutrients.magnesium_mg * ratio),
                  potassium_mg: Math.round(ing.nutrients.potassium_mg * ratio),
                  sodium_mg: Math.round(ing.nutrients.sodium_mg * ratio),
                  zinc_mg: Math.round(ing.nutrients.zinc_mg * ratio * 10) / 10,
                },
              };
            })
          : undefined;

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
          nutrientsPer100g: food.nutrientsPer100g,
          imageUrl: food.imageUrl,
          source: food.source,
          barcode: food.barcode,
          packageQuantityGrams: food.packageQuantityGrams,
          packageQuantityUnitName: food.packageQuantityUnitName,
          servingQuantityGrams: food.servingQuantityGrams,
          offQuantity: food.offQuantity,
          decomposedIngredients: scaledDecomposedIngredients,
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

      updateLoggedFoodGrams: (loggedFoodId, newGrams, date) => {
        const targetDate = date || get().selectedDate || getTodayString();
        const currentLog = get().getDailyLog(targetDate);
        const clampedGrams = Math.max(5, Math.min(3000, Math.round(newGrams)));

        const updatedFoods = currentLog.foods.map((item) => {
          if (item.id !== loggedFoodId) return item;

          // Derive baseline nutrientsPer100g if not already stored on legacy logged items
          const baseGrams = Math.max(1, item.consumedGrams || 100);
          const per100g: NutrientProfile = item.nutrientsPer100g || {
            calories: (item.nutrients.calories * 100) / baseGrams,
            proteinGrams: (item.nutrients.proteinGrams * 100) / baseGrams,
            carbsGrams: (item.nutrients.carbsGrams * 100) / baseGrams,
            fatGrams: (item.nutrients.fatGrams * 100) / baseGrams,
            fiberGrams: (item.nutrients.fiberGrams * 100) / baseGrams,
            sugarGrams: ((item.nutrients.sugarGrams || 0) * 100) / baseGrams,
            vitaminA_mcg: (item.nutrients.vitaminA_mcg * 100) / baseGrams,
            vitaminC_mg: (item.nutrients.vitaminC_mg * 100) / baseGrams,
            vitaminD_mcg: (item.nutrients.vitaminD_mcg * 100) / baseGrams,
            vitaminB12_mcg: (item.nutrients.vitaminB12_mcg * 100) / baseGrams,
            vitaminE_mg: ((item.nutrients.vitaminE_mg || 0) * 100) / baseGrams,
            iron_mg: (item.nutrients.iron_mg * 100) / baseGrams,
            calcium_mg: (item.nutrients.calcium_mg * 100) / baseGrams,
            magnesium_mg: (item.nutrients.magnesium_mg * 100) / baseGrams,
            potassium_mg: (item.nutrients.potassium_mg * 100) / baseGrams,
            sodium_mg: (item.nutrients.sodium_mg * 100) / baseGrams,
            zinc_mg: (item.nutrients.zinc_mg * 100) / baseGrams,
          };

          const recalculated = calculateNutrientsForGrams(per100g, clampedGrams);
          const servingBase = item.servingQuantityGrams || 100;
          const nextServings = Math.round((clampedGrams / Math.max(1, servingBase)) * 10) / 10;

          const scaleRatio = clampedGrams / baseGrams;
          const updatedIngredients = item.decomposedIngredients
            ? item.decomposedIngredients.map((ing) => {
                const oldGrams = Math.max(1, ing.quantityGrams);
                const nextIngGrams = Math.max(1, Math.round(oldGrams * scaleRatio));
                const ingRatio = nextIngGrams / oldGrams;
                return {
                  ...ing,
                  quantityGrams: nextIngGrams,
                  nutrients: {
                    calories: Math.round(ing.nutrients.calories * ingRatio),
                    proteinGrams: Math.round(ing.nutrients.proteinGrams * ingRatio * 10) / 10,
                    carbsGrams: Math.round(ing.nutrients.carbsGrams * ingRatio * 10) / 10,
                    fatGrams: Math.round(ing.nutrients.fatGrams * ingRatio * 10) / 10,
                    fiberGrams: Math.round(ing.nutrients.fiberGrams * ingRatio * 10) / 10,
                    sugarGrams: Math.round((ing.nutrients.sugarGrams || 0) * ingRatio * 10) / 10,
                    vitaminA_mcg: Math.round(ing.nutrients.vitaminA_mcg * ingRatio),
                    vitaminC_mg: Math.round(ing.nutrients.vitaminC_mg * ingRatio * 10) / 10,
                    vitaminD_mcg: Math.round(ing.nutrients.vitaminD_mcg * ingRatio * 10) / 10,
                    vitaminB12_mcg: Math.round(ing.nutrients.vitaminB12_mcg * ingRatio * 100) / 100,
                    vitaminE_mg: Math.round((ing.nutrients.vitaminE_mg || 0) * ingRatio * 10) / 10,
                    iron_mg: Math.round(ing.nutrients.iron_mg * ingRatio * 10) / 10,
                    calcium_mg: Math.round(ing.nutrients.calcium_mg * ingRatio),
                    magnesium_mg: Math.round(ing.nutrients.magnesium_mg * ingRatio),
                    potassium_mg: Math.round(ing.nutrients.potassium_mg * ingRatio),
                    sodium_mg: Math.round(ing.nutrients.sodium_mg * ingRatio),
                    zinc_mg: Math.round(ing.nutrients.zinc_mg * ingRatio * 10) / 10,
                  },
                };
              })
            : undefined;

          return {
            ...item,
            consumedGrams: clampedGrams,
            servings: nextServings,
            nutrients: recalculated,
            nutrientsPer100g: per100g,
            decomposedIngredients: updatedIngredients,
          };
        });

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

      updateLoggedFoodIngredientGrams: (loggedFoodId, ingredientIndex, deltaGrams, date) => {
        const targetDate = date || get().selectedDate || getTodayString();
        const currentLog = get().getDailyLog(targetDate);

        const updatedFoods = currentLog.foods.map((item) => {
          if (item.id !== loggedFoodId || !item.decomposedIngredients) return item;

          const updatedIngredients = item.decomposedIngredients.map((ing, idx) => {
            if (idx !== ingredientIndex) return ing;
            const oldGrams = Math.max(1, ing.quantityGrams);
            const nextGrams = Math.max(5, Math.min(2000, Math.round(oldGrams + deltaGrams)));
            if (ing.matchedFoodItem) {
              return {
                ...ing,
                quantityGrams: nextGrams,
                nutrients: calculateNutrientsForGrams(ing.matchedFoodItem.nutrientsPer100g, nextGrams),
              };
            }
            const ratio = nextGrams / oldGrams;
            return {
              ...ing,
              quantityGrams: nextGrams,
              nutrients: {
                calories: Math.round(ing.nutrients.calories * ratio),
                proteinGrams: Math.round(ing.nutrients.proteinGrams * ratio * 10) / 10,
                carbsGrams: Math.round(ing.nutrients.carbsGrams * ratio * 10) / 10,
                fatGrams: Math.round(ing.nutrients.fatGrams * ratio * 10) / 10,
                fiberGrams: Math.round(ing.nutrients.fiberGrams * ratio * 10) / 10,
                sugarGrams: Math.round((ing.nutrients.sugarGrams || 0) * ratio * 10) / 10,
                vitaminA_mcg: Math.round(ing.nutrients.vitaminA_mcg * ratio),
                vitaminC_mg: Math.round(ing.nutrients.vitaminC_mg * ratio * 10) / 10,
                vitaminD_mcg: Math.round(ing.nutrients.vitaminD_mcg * ratio * 10) / 10,
                vitaminB12_mcg: Math.round(ing.nutrients.vitaminB12_mcg * ratio * 100) / 100,
                vitaminE_mg: Math.round((ing.nutrients.vitaminE_mg || 0) * ratio * 10) / 10,
                iron_mg: Math.round(ing.nutrients.iron_mg * ratio * 10) / 10,
                calcium_mg: Math.round(ing.nutrients.calcium_mg * ratio),
                magnesium_mg: Math.round(ing.nutrients.magnesium_mg * ratio),
                potassium_mg: Math.round(ing.nutrients.potassium_mg * ratio),
                sodium_mg: Math.round(ing.nutrients.sodium_mg * ratio),
                zinc_mg: Math.round(ing.nutrients.zinc_mg * ratio * 10) / 10,
              },
            };
          });

          const totalGrams = Math.max(
            5,
            Math.round(updatedIngredients.reduce((acc, i) => acc + i.quantityGrams, 0))
          );

          const totalNutrients: NutrientProfile = updatedIngredients.reduce(
            (acc, i) => ({
              calories: Math.round(acc.calories + i.nutrients.calories),
              proteinGrams: Math.round((acc.proteinGrams + i.nutrients.proteinGrams) * 10) / 10,
              carbsGrams: Math.round((acc.carbsGrams + i.nutrients.carbsGrams) * 10) / 10,
              fatGrams: Math.round((acc.fatGrams + i.nutrients.fatGrams) * 10) / 10,
              fiberGrams: Math.round((acc.fiberGrams + i.nutrients.fiberGrams) * 10) / 10,
              sugarGrams: Math.round(((acc.sugarGrams || 0) + (i.nutrients.sugarGrams || 0)) * 10) / 10,
              vitaminA_mcg: Math.round(acc.vitaminA_mcg + i.nutrients.vitaminA_mcg),
              vitaminC_mg: Math.round((acc.vitaminC_mg + i.nutrients.vitaminC_mg) * 10) / 10,
              vitaminD_mcg: Math.round((acc.vitaminD_mcg + i.nutrients.vitaminD_mcg) * 10) / 10,
              vitaminB12_mcg: Math.round((acc.vitaminB12_mcg + i.nutrients.vitaminB12_mcg) * 100) / 100,
              vitaminE_mg: Math.round((acc.vitaminE_mg + (i.nutrients.vitaminE_mg || 0)) * 10) / 10,
              iron_mg: Math.round((acc.iron_mg + i.nutrients.iron_mg) * 10) / 10,
              calcium_mg: Math.round(acc.calcium_mg + i.nutrients.calcium_mg),
              magnesium_mg: Math.round(acc.magnesium_mg + i.nutrients.magnesium_mg),
              potassium_mg: Math.round(acc.potassium_mg + i.nutrients.potassium_mg),
              sodium_mg: Math.round(acc.sodium_mg + i.nutrients.sodium_mg),
              zinc_mg: Math.round((acc.zinc_mg + i.nutrients.zinc_mg) * 10) / 10,
            }),
            {
              calories: 0,
              proteinGrams: 0,
              carbsGrams: 0,
              fatGrams: 0,
              fiberGrams: 0,
              sugarGrams: 0,
              vitaminA_mcg: 0,
              vitaminC_mg: 0,
              vitaminD_mcg: 0,
              vitaminB12_mcg: 0,
              vitaminE_mg: 0,
              iron_mg: 0,
              calcium_mg: 0,
              magnesium_mg: 0,
              potassium_mg: 0,
              sodium_mg: 0,
              zinc_mg: 0,
            }
          );

          const scaleTo100g = 100 / Math.max(1, totalGrams);
          const per100g: NutrientProfile = {
            calories: Math.round(totalNutrients.calories * scaleTo100g),
            proteinGrams: Math.round(totalNutrients.proteinGrams * scaleTo100g * 10) / 10,
            carbsGrams: Math.round(totalNutrients.carbsGrams * scaleTo100g * 10) / 10,
            fatGrams: Math.round(totalNutrients.fatGrams * scaleTo100g * 10) / 10,
            fiberGrams: Math.round(totalNutrients.fiberGrams * scaleTo100g * 10) / 10,
            sugarGrams: Math.round((totalNutrients.sugarGrams || 0) * scaleTo100g * 10) / 10,
            vitaminA_mcg: Math.round(totalNutrients.vitaminA_mcg * scaleTo100g),
            vitaminC_mg: Math.round(totalNutrients.vitaminC_mg * scaleTo100g * 10) / 10,
            vitaminD_mcg: Math.round(totalNutrients.vitaminD_mcg * scaleTo100g * 10) / 10,
            vitaminB12_mcg: Math.round(totalNutrients.vitaminB12_mcg * scaleTo100g * 100) / 100,
            vitaminE_mg: Math.round(totalNutrients.vitaminE_mg * scaleTo100g * 10) / 10,
            iron_mg: Math.round(totalNutrients.iron_mg * scaleTo100g * 10) / 10,
            calcium_mg: Math.round(totalNutrients.calcium_mg * scaleTo100g),
            magnesium_mg: Math.round(totalNutrients.magnesium_mg * scaleTo100g),
            potassium_mg: Math.round(totalNutrients.potassium_mg * scaleTo100g),
            sodium_mg: Math.round(totalNutrients.sodium_mg * scaleTo100g),
            zinc_mg: Math.round(totalNutrients.zinc_mg * scaleTo100g * 10) / 10,
          };

          return {
            ...item,
            consumedGrams: totalGrams,
            nutrients: totalNutrients,
            nutrientsPer100g: per100g,
            decomposedIngredients: updatedIngredients,
          };
        });

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
        let totalSugar = 0;
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
          totalSugar += f.nutrients.sugarGrams || 0;
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
        totalSugar = Math.round(totalSugar * 10) / 10;
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

        // Dynamic daily sugar max ceiling scaled by body weight / calorie budget (~6% of daily calories, clamped 25g–50g)
        const sugarLimitGrams =
          log.targetSugar && log.targetSugar > 0
            ? log.targetSugar
            : Math.max(25, Math.min(50, Math.round((log.targetCalories * 0.06) / 4)));

        const calPct = log.targetCalories > 0 ? Math.min(100, Math.round((totalCalories / log.targetCalories) * 100)) : 0;
        const proPct = log.targetProtein > 0 ? Math.min(100, Math.round((totalProtein / log.targetProtein) * 100)) : 0;
        const carbPct = log.targetCarbs > 0 ? Math.min(100, Math.round((totalCarbs / log.targetCarbs) * 100)) : 0;
        const fatPct = log.targetFat > 0 ? Math.min(100, Math.round((totalFat / log.targetFat) * 100)) : 0;
        const fiberPct = log.targetFiber > 0 ? Math.min(100, Math.round((totalFiber / log.targetFiber) * 100)) : 0;
        const sugarPct = sugarLimitGrams > 0 ? Math.min(100, Math.round((totalSugar / sugarLimitGrams) * 100)) : 0;

        return {
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat,
          totalFiber,
          totalSugar,
          sugarLimitGrams,
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
          sugarProgressPercent: sugarPct,
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
    }),
    {
      name: 'zerocoach-nutrition-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ...state,
        selectedDate: getTodayString(),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.selectedDate = getTodayString();

        if (state.logsByDate) {
          // Clean legacy demo foods
          for (const date in state.logsByDate) {
            state.logsByDate[date].foods = state.logsByDate[date].foods.filter(
              (f) => !f.id.startsWith('demo_')
            );
          }

          // If foods were saved to tomorrow's date with today's timestamp, move them to today
          const today = getTodayString();
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

          if (state.logsByDate[tomorrowStr]?.foods?.length > 0) {
            const todayLog = state.logsByDate[today] || {
              date: today,
              targetCalories: state.logsByDate[tomorrowStr].targetCalories || 2450,
              targetProtein: state.logsByDate[tomorrowStr].targetProtein || 175,
              targetCarbs: state.logsByDate[tomorrowStr].targetCarbs || 260,
              targetFat: state.logsByDate[tomorrowStr].targetFat || 75,
              targetFiber: state.logsByDate[tomorrowStr].targetFiber || 35,
              foods: [],
            };

            const now = Date.now();
            const foodsToMove = state.logsByDate[tomorrowStr].foods.filter(
              (f) => f.timestamp <= now + 60000
            );
            const foodsToKeep = state.logsByDate[tomorrowStr].foods.filter(
              (f) => f.timestamp > now + 60000
            );

            if (foodsToMove.length > 0) {
              const existingIds = new Set(todayLog.foods.map((f) => f.id));
              const newFoods = foodsToMove.filter((f) => !existingIds.has(f.id));
              todayLog.foods = [...todayLog.foods, ...newFoods];
              state.logsByDate[today] = todayLog;
              state.logsByDate[tomorrowStr].foods = foodsToKeep;
            }
          }
        }
      },
    }
  )
);

