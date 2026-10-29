import { ToolCall, ToolResult } from './types';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useCoachStore } from '@/store/useCoachStore';
import {
  searchUsdaFoods,
  searchOpenFoodFacts,
  fetchProductByBarcode,
} from '@/services/nutrition/openFoodFactsService';
import { exerciseRepository } from '@/services/workout/exerciseRepository';
import {
  generateAdaptiveWorkoutPlan,
  createExerciseItemFromRepDB,
} from '@/services/workout/workoutPlanGenerator';
import { FoodItem, MealType } from '@/types/nutrition';
import { GeneratedWorkoutPlan, ExerciseItem, WorkoutSplit } from '@/types/workout';

function parseNumber(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

/**
 * Normalizes tool name variants and aliases to the standard tool names
 */
export function normalizeToolName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const lower = name.toLowerCase().trim().replace(/[\s-]+/g, '_');
  switch (lower) {
    case 'log_food_item':
    case 'add_food_item':
    case 'log_food':
    case 'add_food':
    case 'record_food':
    case 'log_meal':
      return 'log_food_item';

    case 'get_food_history':
    case 'get_nutrition_history':
    case 'get_food_log':
    case 'get_daily_log':
    case 'get_daily_nutrition':
      return 'get_food_history';

    case 'delete_logged_food':
    case 'remove_logged_food':
    case 'delete_food_item':
    case 'remove_food_item':
      return 'delete_logged_food';

    case 'search_food_database':
    case 'search_food':
    case 'search_usda_foods':
    case 'search_foods':
    case 'search_food_items':
      return 'search_food_database';

    case 'get_workout_plan':
    case 'get_today_workout':
    case 'get_workout':
    case 'get_workout_for_date':
      return 'get_workout_plan';

    case 'update_workout_plan':
    case 'save_workout_plan':
    case 'create_workout_plan':
      return 'update_workout_plan';

    case 'swap_plan_exercise':
    case 'swap_exercise':
    case 'swap_exercise_in_plan':
    case 'replace_exercise':
      return 'swap_plan_exercise';

    case 'search_exercises':
    case 'search_exercise_database':
    case 'search_exercise':
    case 'get_exercises':
      return 'search_exercises';

    case 'get_telemetry_metrics':
    case 'get_fitness_telemetry':
    case 'get_telemetry':
    case 'get_metrics':
      return 'get_telemetry_metrics';

    case 'sync_fitness_telemetry':
    case 'sync_telemetry':
    case 'sync_health':
      return 'sync_fitness_telemetry';

    case 'get_user_settings':
    case 'get_user_profile':
    case 'get_profile':
    case 'get_athlete_profile':
      return 'get_user_settings';

    case 'update_user_settings':
    case 'update_user_goals':
    case 'update_goals':
    case 'set_user_goals':
      return 'update_user_settings';

    default:
      return lower;
  }
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const { id, name, arguments: args } = call;
  const toolName = normalizeToolName(name);

  try {
    switch (toolName) {
      // =====================================================================
      // DOMAIN 1: FITNESS APP DATA (TELEMETRY) [READ]
      // =====================================================================
      case 'get_telemetry_metrics': {
        const telemetry = useTelemetryStore.getState();
        const m = telemetry.metrics;
        return {
          toolCallId: id,
          name,
          success: true,
          data: {
            readinessScore: m.readinessScore,
            status: m.readinessScore >= 80 ? 'Optimal' : m.readinessScore >= 60 ? 'Baseline' : 'Deload/Fatigued',
            hrvMs: m.heartRateVariability,
            restingHeartRate: m.restingHeartRate,
            sleepHours: m.sleepHours,
            deepSleepHours: m.deepSleepHours,
            sleepQualityScore: m.sleepQualityScore,
            activeCalories: m.activeCalories,
            steps: m.steps,
            calisthenicsStage: telemetry.calisthenicsStages[0]?.stageTitle || 'Unknown',
            lastSyncTimestamp: m.lastSyncTimestamp,
          },
          summary: `Readiness Score: ${m.readinessScore}/100, HRV: ${m.heartRateVariability}ms, Sleep: ${m.sleepHours}h, Steps: ${m.steps}`,
        };
      }

      case 'sync_fitness_telemetry': {
        const telemetry = useTelemetryStore.getState();
        await telemetry.syncTelemetry();
        const m = telemetry.metrics;
        return {
          toolCallId: id,
          name,
          success: true,
          data: {
            readinessScore: m.readinessScore,
            hrvMs: m.heartRateVariability,
            restingHeartRate: m.restingHeartRate,
            activeCalories: m.activeCalories,
          },
          summary: `Wearable telemetry synced. Fresh readiness score: ${m.readinessScore}/100`,
        };
      }

      // =====================================================================
      // DOMAIN 2: USER FOOD HISTORY [READ / WRITE]
      // =====================================================================
      case 'get_food_history': {
        const targetDate = args.date || getTodayString();
        const nutrition = useNutritionStore.getState();
        const summary = nutrition.getSummaryForDate(targetDate);
        const dailyLog = nutrition.getDailyLog(targetDate);

        const compactFoods = dailyLog.foods.map((f) => ({
          id: f.id,
          name: f.name,
          mealType: f.mealType,
          grams: f.consumedGrams,
          calories: f.nutrients.calories,
          protein: f.nutrients.proteinGrams,
          carbs: f.nutrients.carbsGrams,
          fat: f.nutrients.fatGrams,
        }));

        return {
          toolCallId: id,
          name,
          success: true,
          data: {
            date: targetDate,
            totals: {
              calories: summary.totalCalories,
              targetCalories: dailyLog.targetCalories,
              remainingCalories: summary.remainingCalories,
              proteinGrams: summary.totalProtein,
              targetProtein: dailyLog.targetProtein,
              remainingProtein: summary.remainingProtein,
              carbsGrams: summary.totalCarbs,
              fatGrams: summary.totalFat,
              fiberGrams: summary.totalFiber,
            },
            foods: compactFoods,
          },
          summary: `Food history for ${targetDate}: ${summary.totalCalories} / ${dailyLog.targetCalories} kcal, ${summary.totalProtein}g protein logged (${compactFoods.length} items)`,
        };
      }

      case 'log_food_item': {
        const targetDate = args.date || getTodayString();
        const nutrition = useNutritionStore.getState();
        let mealType: MealType = 'snack';
        if (args.mealType && ['breakfast', 'lunch', 'dinner', 'snack'].includes(String(args.mealType).toLowerCase())) {
          mealType = String(args.mealType).toLowerCase() as MealType;
        }

        const consumedGrams = Math.max(1, parseNumber(args.consumedGrams, 100));
        const calories = Math.max(0, parseNumber(args.calories, 0));
        const proteinGrams = Math.max(0, parseNumber(args.proteinGrams, 0));
        const carbsGrams = Math.max(0, parseNumber(args.carbsGrams, 0));
        const fatGrams = Math.max(0, parseNumber(args.fatGrams, 0));
        const fiberGrams = Math.max(0, parseNumber(args.fiberGrams, 0));
        const foodName = args.name ? String(args.name).trim() : 'Logged Food';

        const foodItem: FoodItem = {
          id: `ai-food-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: foodName,
          category: 'prepared_meal',
          servingSizeGrams: consumedGrams,
          servingUnitName: `${consumedGrams}g`,
          nutrientsPer100g: {
            calories: Math.round((calories / consumedGrams) * 100),
            proteinGrams: Math.round((proteinGrams / consumedGrams) * 100 * 10) / 10,
            carbsGrams: Math.round((carbsGrams / consumedGrams) * 100 * 10) / 10,
            fatGrams: Math.round((fatGrams / consumedGrams) * 100 * 10) / 10,
            fiberGrams: Math.round((fiberGrams / consumedGrams) * 100 * 10) / 10,
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
          },
          source: 'custom',
          hasCompleteMicros: false,
        };

        nutrition.logFood(foodItem, mealType, 1, consumedGrams, targetDate);
        const updatedSummary = nutrition.getSummaryForDate(targetDate);

        return {
          toolCallId: id,
          name: 'log_food_item',
          success: true,
          data: {
            loggedFood: {
              name: foodName,
              mealType,
              consumedGrams,
              calories,
              proteinGrams,
              carbsGrams,
              fatGrams,
            },
            updatedDayTotals: {
              totalCalories: updatedSummary.totalCalories,
              remainingCalories: updatedSummary.remainingCalories,
              totalProtein: updatedSummary.totalProtein,
              remainingProtein: updatedSummary.remainingProtein,
            },
          },
          summary: `Logged "${foodName}" (${consumedGrams}g, ${calories} kcal, ${proteinGrams}g protein) to ${mealType}`,
        };
      }

      case 'delete_logged_food': {
        const targetDate = args.date || getTodayString();
        const nutrition = useNutritionStore.getState();
        nutrition.removeLoggedFood(args.loggedFoodId, targetDate);
        return {
          toolCallId: id,
          name,
          success: true,
          data: { loggedFoodId: args.loggedFoodId, date: targetDate },
          summary: `Deleted food entry ${args.loggedFoodId} from ${targetDate}`,
        };
      }

      case 'update_daily_macro_targets': {
        const targetDate = args.date || getTodayString();
        const nutrition = useNutritionStore.getState();
        nutrition.updateDailyTargets(
          {
            targetCalories: args.targetCalories,
            targetProtein: args.targetProtein,
            targetCarbs: args.targetCarbs,
            targetFat: args.targetFat,
            targetFiber: args.targetFiber,
          },
          targetDate
        );
        return {
          toolCallId: id,
          name,
          success: true,
          data: { date: targetDate, targets: args },
          summary: `Updated daily macro targets: ${args.targetCalories || 'kept'} kcal, ${args.targetProtein || 'kept'}g protein`,
        };
      }

      // =====================================================================
      // DOMAIN 3: FOOD DATABASE [READ]
      // =====================================================================
      case 'search_food_database': {
        const query = String(args.query || '').trim();
        const source = args.source || 'all';
        let results: FoodItem[] = [];

        if (source === 'all' || source === 'usda') {
          const usdaMatches = searchUsdaFoods(query).slice(0, 5);
          results = results.concat(usdaMatches);
        }

        if ((source === 'all' || source === 'openfoodfacts') && results.length < 5) {
          try {
            const offMatches = await searchOpenFoodFacts(query, 1, 5);
            results = results.concat(offMatches);
          } catch {
            // graceful fallback to USDA results
          }
        }

        const compactResults = results.slice(0, 6).map((f) => ({
          id: f.id,
          name: f.name,
          source: f.source,
          brand: f.brand,
          servingGrams: f.servingSizeGrams,
          caloriesPer100g: f.nutrientsPer100g.calories,
          proteinPer100g: f.nutrientsPer100g.proteinGrams,
          carbsPer100g: f.nutrientsPer100g.carbsGrams,
          fatPer100g: f.nutrientsPer100g.fatGrams,
        }));

        return {
          toolCallId: id,
          name,
          success: true,
          data: compactResults,
          summary: `Found ${compactResults.length} food items matching "${query}"`,
        };
      }

      case 'get_food_details': {
        const barcode = String(args.barcode || '').trim();
        const product = await fetchProductByBarcode(barcode);
        if (!product) {
          return {
            toolCallId: id,
            name,
            success: false,
            error: `No product found for barcode ${barcode}`,
            summary: `No product found for barcode ${barcode}`,
          };
        }
        return {
          toolCallId: id,
          name,
          success: true,
          data: product,
          summary: `Found product: "${product.name}" (${product.brand || 'Unbranded'}), ${product.nutrientsPer100g.calories} kcal/100g`,
        };
      }

      // =====================================================================
      // DOMAIN 4: USER WORKOUT HISTORY [READ / WRITE]
      // =====================================================================
      case 'get_workout_history': {
        const workoutStore = useWorkoutStore.getState();
        if (args.date) {
          const session = workoutStore.getWorkoutForDate(args.date);
          return {
            toolCallId: id,
            name,
            success: true,
            data: session || null,
            summary: session
              ? `Session on ${args.date}: "${session.title}", ${session.durationMinutes} min, ${session.completedMovements} movements`
              : `No completed workout session logged on ${args.date}`,
          };
        }

        const days = args.daysCount || 7;
        const history = workoutStore.getRecentHistory(days).map((s) => ({
          date: s.date,
          title: s.title,
          split: s.split,
          tier: s.tier,
          durationMinutes: s.durationMinutes,
          totalSets: s.totalSets,
          caloriesBurned: s.caloriesBurned,
          exercisesCount: s.exercises.length,
          completedCount: s.completedExerciseIds.length,
        }));

        return {
          toolCallId: id,
          name,
          success: true,
          data: history,
          summary: `Retrieved ${history.length} completed workout sessions from the last ${days} days`,
        };
      }

      case 'log_completed_workout': {
        const targetDate = args.date || getTodayString();
        const workoutStore = useWorkoutStore.getState();

        // Support detailed exercises array or fallback to exerciseNames array
        const rawExercises: Array<{ name: string; sets?: number; reps?: string | number; weightKg?: number }> =
          Array.isArray(args.exercises) && args.exercises.length > 0
            ? args.exercises
            : (args.exerciseNames || []).map((name: string) => ({
                name,
                sets: args.sets || 1,
                reps: args.reps ? String(args.reps) : '10 reps',
              }));

        // If both were empty but a title was passed (e.g. "Pull-up 10 reps"), extract title as exercise name
        if (rawExercises.length === 0 && args.title) {
          rawExercises.push({
            name: args.title,
            sets: args.sets || 1,
            reps: args.reps ? String(args.reps) : '10 reps',
          });
        }

        const completedExercises: ExerciseItem[] = rawExercises.map((ex, i) => {
          const sets = Math.max(1, parseNumber(ex.sets, 1));
          const repsRaw = ex.reps !== undefined ? String(ex.reps).trim() : '10 reps';
          const repsFormatted = repsRaw.toLowerCase().includes('rep') ? repsRaw : `${repsRaw} reps`;

          const repDb = exerciseRepository.search(ex.name)[0];
          if (repDb) {
            return createExerciseItemFromRepDB(repDb, 'strength', sets, repsFormatted);
          }
          return {
            id: `manual-ex-${Date.now()}-${i}`,
            name: ex.name,
            category: 'strength',
            targetSets: sets,
            targetReps: repsFormatted,
            restPeriodSeconds: 90,
            intensityNote: 'Logged via AI Coach',
            coachingCue: 'Executed with controlled cadence.',
          };
        });

        const completedIds = completedExercises.map((e) => e.id);
        const totalSets = completedExercises.reduce((sum, e) => sum + (e.targetSets || 1), 0);
        const durationMinutes = Math.max(1, parseNumber(args.durationMinutes, Math.min(45, totalSets * 3)));
        const caloriesBurned = Math.max(10, parseNumber(args.caloriesBurned, totalSets * 12));

        const session = workoutStore.finishWorkout({
          date: targetDate,
          planId: `session-${Date.now()}`,
          title: args.title || (completedExercises[0] ? `${completedExercises[0].name} Session` : 'Completed Workout'),
          split: 'full_body',
          tier: 'optimal',
          exercises: completedExercises,
          completedExerciseIds: completedIds,
          skippedExerciseIds: [],
          totalMovements: completedExercises.length,
          completedMovements: completedIds.length,
          totalSets,
          startedAt: Date.now() - durationMinutes * 60 * 1000,
          durationMinutes,
          caloriesBurned,
        });

        const summaryText = completedExercises
          .map((e) => `${e.name} (${e.targetSets} set${e.targetSets > 1 ? 's' : ''} × ${e.targetReps})`)
          .join(', ');

        return {
          toolCallId: id,
          name: 'log_completed_workout',
          success: true,
          data: session,
          summary: `Logged workout: ${summaryText} on ${targetDate}`,
        };
      }

      // =====================================================================
      // DOMAIN 5: USER WORKOUT PLAN [READ / WRITE]
      // =====================================================================
      case 'get_workout_plan': {
        const targetDate = args.date || getTodayString();
        const workoutStore = useWorkoutStore.getState();
        const savedPlan = workoutStore.getPlanForDate(targetDate);

        if (savedPlan) {
          const compact = {
            id: savedPlan.id,
            title: savedPlan.title,
            split: savedPlan.selectedSplit || 'custom',
            tier: savedPlan.tier,
            estimatedDurationMin: savedPlan.estimatedDurationMin,
            exercises: savedPlan.exercises.map((e) => ({
              id: e.id,
              name: e.name,
              category: e.category,
              sets: e.targetSets,
              reps: e.targetReps,
              restSec: e.restPeriodSeconds,
              cue: e.coachingCue,
            })),
          };
          return {
            toolCallId: id,
            name,
            success: true,
            data: compact,
            summary: `Active plan on ${targetDate}: "${savedPlan.title}" (${savedPlan.exercises.length} movements)`,
          };
        }

        // Fallback: Generate adaptive readiness plan for that date
        const coach = useCoachStore.getState();
        const telemetry = useTelemetryStore.getState();
        const plan = generateAdaptiveWorkoutPlan({
          goals: coach.userProfile.primaryGoals || ['strength_hypertrophy'],
          readinessScore: telemetry.metrics.readinessScore,
          weightKg: coach.userProfile.weightKg,
          heightCm: coach.userProfile.heightCm,
          activeStages: telemetry.calisthenicsStages,
          activeCalories: telemetry.metrics.activeCalories,
          skillLevel: coach.userProfile.skillLevel,
          equipmentMode: coach.userProfile.equipmentPreference === 'home' ? 'bodyweight' : 'all',
        });

        const compactGenerated = {
          id: plan.id,
          title: plan.title,
          split: plan.selectedSplit || 'full_body',
          tier: plan.tier,
          estimatedDurationMin: plan.estimatedDurationMin,
          exercises: plan.exercises.map((e) => ({
            id: e.id,
            name: e.name,
            category: e.category,
            sets: e.targetSets,
            reps: e.targetReps,
            restSec: e.restPeriodSeconds,
            cue: e.coachingCue,
          })),
        };

        return {
          toolCallId: id,
          name,
          success: true,
          data: compactGenerated,
          summary: `Adaptive plan generated for ${targetDate}: "${plan.title}" (${plan.exercises.length} movements)`,
        };
      }

      case 'update_workout_plan': {
        const targetDate = args.date || getTodayString();
        const workoutStore = useWorkoutStore.getState();
        const inputExercises: any[] = args.exercises || [];

        const structuredExercises: ExerciseItem[] = inputExercises.map((e, index) => {
          const repDb = e.id ? exerciseRepository.getById(e.id) : exerciseRepository.search(e.name || '')[0];
          if (repDb) {
            return createExerciseItemFromRepDB(
              repDb,
              (e.category as any) || 'strength',
              e.targetSets || 3,
              e.targetReps || '8–12 reps',
              e.restPeriodSeconds || 90,
              e.intensityNote || 'Updated via Coach',
              e.coachingCue
            );
          }
          return {
            id: e.id || `custom-ex-${Date.now()}-${index}`,
            name: e.name || `Exercise ${index + 1}`,
            category: (e.category as any) || 'strength',
            targetSets: e.targetSets || 3,
            targetReps: e.targetReps || '8–12 reps',
            restPeriodSeconds: e.restPeriodSeconds || 90,
            intensityNote: 'Custom Routine',
            coachingCue: e.coachingCue || 'Control eccentric phase.',
          };
        });

        const newPlan: GeneratedWorkoutPlan = {
          id: `plan-${targetDate}-${Date.now()}`,
          title: args.title || 'Custom AI Workout Plan',
          focusSummary: `Targeted routine for ${targetDate}`,
          tier: 'optimal',
          tierLabel: 'Custom Plan',
          readinessMultiplierDesc: 'Personalized plan updated by ZeroCoach AI',
          estimatedDurationMin: structuredExercises.length * 8,
          exercises: structuredExercises,
          coachingNotes: 'Engineered for optimal muscular tension and recovery balance.',
          generatedDate: targetDate,
          selectedSplit: (args.split as WorkoutSplit) || 'full_body',
        };

        workoutStore.savePlanForDate(targetDate, newPlan);

        return {
          toolCallId: id,
          name,
          success: true,
          data: {
            date: targetDate,
            title: newPlan.title,
            exerciseCount: structuredExercises.length,
            exercises: structuredExercises.map((e) => e.name),
          },
          summary: `Updated workout plan for ${targetDate}: "${newPlan.title}" with ${structuredExercises.length} exercises`,
        };
      }

      case 'swap_plan_exercise': {
        const targetDate = args.date || getTodayString();
        const workoutStore = useWorkoutStore.getState();
        const plan = workoutStore.getPlanForDate(targetDate);

        if (!plan) {
          return {
            toolCallId: id,
            name,
            success: false,
            error: `No workout plan found for ${targetDate}. Call get_workout_plan or update_workout_plan first.`,
            summary: `No plan found for ${targetDate} to swap from`,
          };
        }

        const targetSearch = String(args.targetExerciseNameOrId || '').toLowerCase();
        const targetEx = plan.exercises.find(
          (e) => e.id.toLowerCase() === targetSearch || e.name.toLowerCase().includes(targetSearch)
        );

        if (!targetEx) {
          return {
            toolCallId: id,
            name,
            success: false,
            error: `Target exercise "${args.targetExerciseNameOrId}" not found in ${targetDate} plan.`,
            summary: `Target exercise not found in plan`,
          };
        }

        const replacementSearch = String(args.replacementExerciseNameOrId || '').trim();
        const replacementRepDb =
          exerciseRepository.getById(replacementSearch) ||
          exerciseRepository.search(replacementSearch)[0];

        if (!replacementRepDb) {
          return {
            toolCallId: id,
            name,
            success: false,
            error: `Replacement exercise "${args.replacementExerciseNameOrId}" not found in RepDB.`,
            summary: `Replacement not found in RepDB`,
          };
        }

        const replacementItem = createExerciseItemFromRepDB(
          replacementRepDb,
          targetEx.category,
          targetEx.targetSets,
          targetEx.targetReps,
          targetEx.restPeriodSeconds,
          `Replaced ${targetEx.name}`
        );

        workoutStore.swapPlanExercise(targetDate, targetEx.id, replacementItem);

        return {
          toolCallId: id,
          name,
          success: true,
          data: {
            date: targetDate,
            swappedOut: targetEx.name,
            swappedIn: replacementItem.name,
          },
          summary: `Swapped "${targetEx.name}" with "${replacementItem.name}" in ${targetDate} workout plan`,
        };
      }

      // =====================================================================
      // DOMAIN 6: WORKOUT DATABASE (REPDB) [READ]
      // =====================================================================
      case 'search_exercises': {
        const query = String(args.query || '');
        const muscle = args.muscle ? String(args.muscle).toLowerCase() : undefined;
        const equipment = args.equipment ? String(args.equipment).toLowerCase() : undefined;

        let matches = exerciseRepository.search(query);
        if (muscle) {
          matches = matches.filter((e) => e.primary_muscles.some((m) => m.toLowerCase().includes(muscle)));
        }
        if (equipment) {
          matches = matches.filter((e) => e.equipment?.toLowerCase().includes(equipment));
        }

        const compactMatches = matches.slice(0, 6).map((e) => ({
          id: e.id,
          name: e.name_en,
          bodyPart: e.body_part,
          primaryMuscles: e.primary_muscles,
          equipment: e.equipment,
          difficulty: e.difficulty,
          isBodyweight: e.is_bodyweight,
          met: e.met,
          cue: e.tips_en?.[0] || 'Maintain controlled kinetic form.',
        }));

        return {
          toolCallId: id,
          name,
          success: true,
          data: compactMatches,
          summary: `Found ${compactMatches.length} RepDB exercises matching criteria`,
        };
      }

      case 'get_exercise_details': {
        const search = String(args.exerciseIdOrName || '').trim();
        const ex = exerciseRepository.getById(search) || exerciseRepository.search(search)[0];

        if (!ex) {
          return {
            toolCallId: id,
            name,
            success: false,
            error: `Exercise "${search}" not found in RepDB database.`,
            summary: `Exercise "${search}" not found`,
          };
        }

        return {
          toolCallId: id,
          name,
          success: true,
          data: {
            id: ex.id,
            name: ex.name_en,
            bodyPart: ex.body_part,
            primaryMuscles: ex.primary_muscles,
            secondaryMuscles: ex.secondary_muscles,
            equipment: ex.equipment,
            difficulty: ex.difficulty,
            mechanic: ex.mechanic,
            forceType: ex.force_type,
            instructions: ex.instructions_en,
            tips: ex.tips_en,
            met: ex.met,
          },
          summary: `Details for ${ex.name_en}: ${ex.primary_muscles.join(', ')} | ${ex.equipment || 'bodyweight'}`,
        };
      }

      // =====================================================================
      // DOMAIN 7: ZEROCOACH SETTINGS [READ / WRITE]
      // =====================================================================
      case 'get_user_settings': {
        const coach = useCoachStore.getState();
        return {
          toolCallId: id,
          name,
          success: true,
          data: {
            userProfile: coach.userProfile,
            language: coach.language,
          },
          summary: `User Profile: ${coach.userProfile.skillLevel} level, ${coach.userProfile.weightKg} kg`,
        };
      }

      case 'update_user_settings': {
        const coach = useCoachStore.getState();
        const profileUpdates: any = {};
        if (args.weightKg !== undefined) profileUpdates.weightKg = args.weightKg;
        if (args.heightCm !== undefined) profileUpdates.heightCm = args.heightCm;
        if (args.skillLevel !== undefined) profileUpdates.skillLevel = args.skillLevel;
        if (args.equipmentPreference !== undefined) profileUpdates.equipmentPreference = args.equipmentPreference;
        if (args.primaryGoals !== undefined) profileUpdates.primaryGoals = args.primaryGoals;

        if (Object.keys(profileUpdates).length > 0) {
          coach.updateProfile(profileUpdates);
        }
        if (args.language && (args.language === 'en' || args.language === 'th')) {
          coach.setLanguage(args.language);
        }

        return {
          toolCallId: id,
          name,
          success: true,
          data: { updated: args },
          summary: `Updated athlete settings: ${Object.keys(args).join(', ')}`,
        };
      }

      default:
        return {
          toolCallId: id,
          name,
          success: false,
          error: `Unknown tool "${name}".`,
          summary: `Tool ${name} does not exist`,
        };
    }
  } catch (err: any) {
    return {
      toolCallId: id,
      name,
      success: false,
      error: err?.message || String(err),
      summary: `Failed to execute ${name}: ${err?.message || 'Error'}`,
    };
  }
}

