import { ToolDefinition } from './types';

export const AGENT_TOOLS: ToolDefinition[] = [
  // =========================================================================
  // DOMAIN 1: FITNESS APP DATA (TELEMETRY) [READ]
  // =========================================================================
  {
    name: 'get_telemetry_metrics',
    description:
      'Read live athletic telemetry from wearables and health apps: readiness score (0-100), HRV (ms), resting heart rate, sleep duration & quality, active calories burned, daily steps, and calisthenics skill stage.',
    domain: 'telemetry',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'sync_fitness_telemetry',
    description:
      'Trigger an on-device health sync with Android Health Connect or Apple HealthKit to refresh the latest biometric data from paired wearables.',
    domain: 'telemetry',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // =========================================================================
  // DOMAIN 2: USER FOOD HISTORY [READ / WRITE]
  // =========================================================================
  {
    name: 'get_food_history',
    description:
      'Read the user food history and daily nutrition summary for a given date (YYYY-MM-DD format). Returns total calories, macros (protein, carbs, fat, fiber), micronutrients, and list of logged meal items.',
    domain: 'food_history',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Calendar date in YYYY-MM-DD format. Defaults to today if omitted.',
        },
      },
      required: [],
    },
  },
  {
    name: 'log_food_item',
    description:
      'Write/log a food item to the user food history. Computes macros and updates remaining daily targets.',
    domain: 'food_history',
    access: 'write',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the food item (e.g., "Grilled Chicken Breast", "Jasmine Rice").',
        },
        mealType: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: 'Meal category to log food under (defaults to "snack" if omitted).',
        },
        calories: {
          type: 'number',
          description: 'Calories in kcal for the consumed amount.',
        },
        proteinGrams: {
          type: 'number',
          description: 'Protein content in grams.',
        },
        carbsGrams: {
          type: 'number',
          description: 'Carbohydrates content in grams.',
        },
        fatGrams: {
          type: 'number',
          description: 'Fat content in grams.',
        },
        fiberGrams: {
          type: 'number',
          description: 'Dietary fiber in grams (optional).',
        },
        consumedGrams: {
          type: 'number',
          description: 'Total weight of food portion consumed in grams.',
        },
        date: {
          type: 'string',
          description: 'Calendar date in YYYY-MM-DD format. Defaults to today if omitted.',
        },
      },
      required: ['name', 'calories'],
    },
  },
  {
    name: 'delete_logged_food',
    description: 'Delete or remove a previously logged food item by its ID from food history.',
    domain: 'food_history',
    access: 'write',
    parameters: {
      type: 'object',
      properties: {
        loggedFoodId: {
          type: 'string',
          description: 'The unique ID of the logged food entry to remove.',
        },
        date: {
          type: 'string',
          description: 'Calendar date in YYYY-MM-DD format. Defaults to today if omitted.',
        },
      },
      required: ['loggedFoodId'],
    },
  },
  {
    name: 'update_daily_macro_targets',
    description:
      'Update the user daily macro nutrition targets (calories, protein, carbs, fat, fiber).',
    domain: 'food_history',
    access: 'write',
    parameters: {
      type: 'object',
      properties: {
        targetCalories: {
          type: 'number',
          description: 'Daily target calories in kcal.',
        },
        targetProtein: {
          type: 'number',
          description: 'Daily target protein in grams.',
        },
        targetCarbs: {
          type: 'number',
          description: 'Daily target carbohydrates in grams.',
        },
        targetFat: {
          type: 'number',
          description: 'Daily target fat in grams.',
        },
        targetFiber: {
          type: 'number',
          description: 'Daily target fiber in grams.',
        },
        date: {
          type: 'string',
          description: 'Calendar date in YYYY-MM-DD format. Defaults to today if omitted.',
        },
      },
      required: [],
    },
  },

  // =========================================================================
  // DOMAIN 3: FOOD DATABASE [READ]
  // =========================================================================
  {
    name: 'search_food_database',
    description:
      'Search the food database (USDA FoodData Central whole foods and Open Food Facts packaged products) for nutritional composition, macros per 100g, and ingredients.',
    domain: 'food_database',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term for food or ingredient (e.g., "oatmeal", "whey protein", "salmon").',
        },
        source: {
          type: 'string',
          enum: ['all', 'usda', 'openfoodfacts'],
          description: 'Which database source to query. Defaults to "all".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_food_details',
    description: 'Fetch detailed product nutrient profile from Open Food Facts using barcode or product code.',
    domain: 'food_database',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {
        barcode: {
          type: 'string',
          description: 'Numeric barcode string from packaging (EAN/UPC).',
        },
      },
      required: ['barcode'],
    },
  },

  // =========================================================================
  // DOMAIN 4: USER WORKOUT HISTORY [READ / WRITE]
  // =========================================================================
  {
    name: 'get_workout_history',
    description:
      'Read completed workout history: sessions, exercises completed, total volume (kg), duration, and calories burned for past days or a specific calendar date.',
    domain: 'workout_history',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {
        daysCount: {
          type: 'number',
          description: 'Number of recent days to fetch (e.g. 7 or 14). Default is 7.',
        },
        date: {
          type: 'string',
          description: 'Specific calendar date (YYYY-MM-DD) to retrieve single session.',
        },
      },
      required: [],
    },
  },
  {
    name: 'log_completed_workout',
    description:
      'Write/log a finished workout session or exercise set to history with completed exercises, exact sets, reps, duration, and volume.',
    domain: 'workout_history',
    access: 'write',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Workout session title (e.g., "Pull-up Session", "Upper Body Strength").',
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format. Defaults to today if omitted.',
        },
        durationMinutes: {
          type: 'number',
          description: 'Total duration of workout or exercise in minutes (defaults to 10).',
        },
        exercises: {
          type: 'array',
          description: 'List of completed exercises with exact sets and reps performed.',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Exercise name (e.g., "Pull-up", "Push-up", "Barbell Squat").',
              },
              sets: {
                type: 'number',
                description: 'Number of sets completed (default 1 if user did a single set).',
              },
              reps: {
                type: 'string',
                description: 'Reps per set or total reps (e.g. "10 reps", "10", or "12-10-8").',
              },
              weightKg: {
                type: 'number',
                description: 'Weight added in kg if any (0 for bodyweight).',
              },
            },
            required: ['name'],
          },
        },
        exerciseNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Fallback list of exercise names if detailed exercises array is not provided.',
        },
        sets: {
          type: 'number',
          description: 'Default sets across exercises if detailed exercises array is omitted (default 1).',
        },
        reps: {
          type: 'string',
          description: 'Default reps across exercises if detailed exercises array is omitted (e.g. "10 reps").',
        },
        totalVolumeKg: {
          type: 'number',
          description: 'Estimated total volume lifted in kilograms.',
        },
        caloriesBurned: {
          type: 'number',
          description: 'Estimated active calories burned.',
        },
      },
      required: ['title'],
    },
  },

  // =========================================================================
  // DOMAIN 5: USER WORKOUT PLAN [READ / WRITE]
  // =========================================================================
  {
    name: 'get_workout_plan',
    description:
      'Read the user workout plan for a given date (defaults to today). Returns planned split, exercises, target sets, target reps, rest periods, and coaching cues.',
    domain: 'workout_plan',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Calendar date in YYYY-MM-DD format. Defaults to today if omitted.',
        },
      },
      required: [],
    },
  },
  {
    name: 'update_workout_plan',
    description:
      'Write/update the user workout plan for a specific date with a customized routine and exercises.',
    domain: 'workout_plan',
    access: 'write',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Calendar date in YYYY-MM-DD format. Defaults to today if omitted.',
        },
        title: {
          type: 'string',
          description: 'Title of the workout routine (e.g. "Strict Push Progression", "Deload Upper").',
        },
        split: {
          type: 'string',
          enum: [
            'full_body',
            'push',
            'pull',
            'legs',
            'upper',
            'lower',
            'core_mobility',
            'calisthenics_skills',
            'cardio_engine',
          ],
          description: 'Workout split category.',
        },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              targetSets: { type: 'number' },
              targetReps: { type: 'string' },
              restPeriodSeconds: { type: 'number' },
              coachingCue: { type: 'string' },
            },
          },
          description: 'Array of exercises with sets, reps, and cues.',
        },
      },
      required: ['title', 'exercises'],
    },
  },
  {
    name: 'swap_plan_exercise',
    description:
      'Swap an existing exercise in the workout plan with an alternative exercise from RepDB (e.g., swapping Barbell Back Squat for Bulgarian Split Squat).',
    domain: 'workout_plan',
    access: 'write',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Calendar date in YYYY-MM-DD format. Defaults to today if omitted.',
        },
        targetExerciseNameOrId: {
          type: 'string',
          description: 'Name or ID of the existing exercise to replace.',
        },
        replacementExerciseNameOrId: {
          type: 'string',
          description: 'Name or ID of the replacement exercise from RepDB.',
        },
      },
      required: ['targetExerciseNameOrId', 'replacementExerciseNameOrId'],
    },
  },

  // =========================================================================
  // DOMAIN 6: WORKOUT DATABASE (REPDB) [READ]
  // =========================================================================
  {
    name: 'search_exercises',
    description:
      'Search the local RepDB exercise catalog of 643 science-backed movements by name, primary muscle, equipment, or body part.',
    domain: 'workout_database',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Exercise name search term (e.g. "pull up", "bench press", "dip", "deadlift").',
        },
        muscle: {
          type: 'string',
          description: 'Filter by muscle (e.g. "chest", "lats", "quadriceps", "biceps", "triceps", "hamstrings").',
        },
        equipment: {
          type: 'string',
          description: 'Filter by equipment (e.g. "barbell", "dumbbell", "bodyweight", "cable").',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_exercise_details',
    description:
      'Retrieve complete kinetic instructions, biomechanical tips, kinetic pose URLs, and MET score for a specific RepDB exercise.',
    domain: 'workout_database',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {
        exerciseIdOrName: {
          type: 'string',
          description: 'RepDB exercise ID or exact name.',
        },
      },
      required: ['exerciseIdOrName'],
    },
  },

  // =========================================================================
  // DOMAIN 7: ZEROCOACH SETTINGS [READ / WRITE]
  // =========================================================================
  {
    name: 'get_user_settings',
    description:
      'Read user profile settings: weight (kg), height (cm), training goals, skill level (beginner/intermediate/advanced), equipment preference, and app language.',
    domain: 'settings',
    access: 'read',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_user_settings',
    description:
      'Write/update user profile settings: body weight, height, skill level, equipment preference, primary goals, or language.',
    domain: 'settings',
    access: 'write',
    parameters: {
      type: 'object',
      properties: {
        weightKg: {
          type: 'number',
          description: 'Athlete body weight in kilograms.',
        },
        heightCm: {
          type: 'number',
          description: 'Athlete height in centimeters.',
        },
        skillLevel: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Training skill level.',
        },
        equipmentPreference: {
          type: 'string',
          enum: ['home', 'gym', 'both'],
          description: 'Equipment availability preference.',
        },
        language: {
          type: 'string',
          enum: ['en', 'th'],
          description: 'App interface and coach language.',
        },
      },
      required: [],
    },
  },
];

