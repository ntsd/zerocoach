import { FoodItem, NutrientProfile, FoodCategory } from '../../types/nutrition';
import { usdaWholeFoods } from './openFoodFactsService';

export interface DecomposedIngredient {
  name: string;
  matchedFoodItem?: FoodItem;
  quantityGrams: number;
  nutrients: NutrientProfile;
}

export interface MealDecompositionResult {
  dishTitle: string;
  ingredients: DecomposedIngredient[];
  totalGrams: number;
  totalNutrients: NutrientProfile;
  asFoodItem: FoodItem;
}

// Portion weight heuristics for common items
const UNIT_WEIGHT_MAP: Record<string, number> = {
  egg: 50, // 1 large egg ~50g
  eggs: 50,
  banana: 118, // 1 medium banana ~118g
  bananas: 118,
  apple: 180, // 1 medium apple ~180g
  apples: 180,
  avocado: 150, // 1 medium avocado flesh ~150g
  avocados: 150,
  slice: 45, // 1 slice bread ~45g
  slices: 45,
  piece: 100,
  pieces: 100,
  scoop: 30, // 1 scoop protein powder ~30g
  scoops: 30,
  cup: 240, // 1 cup liquid ~240ml/g
  cups: 240,
  tbsp: 15, // 1 tbsp ~15g
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
};

function scaleNutrients(nutrients100g: NutrientProfile, grams: number): NutrientProfile {
  const factor = grams / 100;
  return {
    calories: Math.round(nutrients100g.calories * factor),
    proteinGrams: Math.round(nutrients100g.proteinGrams * factor * 10) / 10,
    carbsGrams: Math.round(nutrients100g.carbsGrams * factor * 10) / 10,
    fatGrams: Math.round(nutrients100g.fatGrams * factor * 10) / 10,
    fiberGrams: Math.round(nutrients100g.fiberGrams * factor * 10) / 10,
    vitaminA_mcg: Math.round(nutrients100g.vitaminA_mcg * factor),
    vitaminC_mg: Math.round(nutrients100g.vitaminC_mg * factor * 10) / 10,
    vitaminD_mcg: Math.round(nutrients100g.vitaminD_mcg * factor * 10) / 10,
    vitaminB12_mcg: Math.round(nutrients100g.vitaminB12_mcg * factor * 100) / 100,
    vitaminE_mg: Math.round(nutrients100g.vitaminE_mg * factor * 10) / 10,
    iron_mg: Math.round(nutrients100g.iron_mg * factor * 10) / 10,
    calcium_mg: Math.round(nutrients100g.calcium_mg * factor),
    magnesium_mg: Math.round(nutrients100g.magnesium_mg * factor),
    potassium_mg: Math.round(nutrients100g.potassium_mg * factor),
    sodium_mg: Math.round(nutrients100g.sodium_mg * factor),
    zinc_mg: Math.round(nutrients100g.zinc_mg * factor * 10) / 10,
  };
}

function sumNutrients(profiles: NutrientProfile[]): NutrientProfile {
  return profiles.reduce(
    (acc, curr) => ({
      calories: acc.calories + curr.calories,
      proteinGrams: Math.round((acc.proteinGrams + curr.proteinGrams) * 10) / 10,
      carbsGrams: Math.round((acc.carbsGrams + curr.carbsGrams) * 10) / 10,
      fatGrams: Math.round((acc.fatGrams + curr.fatGrams) * 10) / 10,
      fiberGrams: Math.round((acc.fiberGrams + curr.fiberGrams) * 10) / 10,
      vitaminA_mcg: acc.vitaminA_mcg + curr.vitaminA_mcg,
      vitaminC_mg: Math.round((acc.vitaminC_mg + curr.vitaminC_mg) * 10) / 10,
      vitaminD_mcg: Math.round((acc.vitaminD_mcg + curr.vitaminD_mcg) * 10) / 10,
      vitaminB12_mcg: Math.round((acc.vitaminB12_mcg + curr.vitaminB12_mcg) * 100) / 100,
      vitaminE_mg: Math.round((acc.vitaminE_mg + curr.vitaminE_mg) * 10) / 10,
      iron_mg: Math.round((acc.iron_mg + curr.iron_mg) * 10) / 10,
      calcium_mg: acc.calcium_mg + curr.calcium_mg,
      magnesium_mg: acc.magnesium_mg + curr.magnesium_mg,
      potassium_mg: acc.potassium_mg + curr.potassium_mg,
      sodium_mg: acc.sodium_mg + curr.sodium_mg,
      zinc_mg: Math.round((acc.zinc_mg + curr.zinc_mg) * 10) / 10,
    }),
    {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
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
}

// Find best matching USDA food for a single ingredient string
export function matchIngredientToUsda(text: string): { food: FoodItem; matchedGrams: number } | null {
  const lower = text.toLowerCase().trim();

  // Extract gram weight if explicitly specified (e.g. "200g chicken breast" or "150 grams rice")
  const gramMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\b/);
  let parsedGrams = gramMatch ? parseFloat(gramMatch[1]) : 0;

  // Extract unit quantities like "2 eggs", "1 avocado", "2 slices bread"
  const unitMatch = lower.match(/^(\d+(?:\.\d+)?)\s+([a-z]+)/);
  if (!parsedGrams && unitMatch) {
    const qty = parseFloat(unitMatch[1]);
    const unitWord = unitMatch[2];
    if (UNIT_WEIGHT_MAP[unitWord]) {
      parsedGrams = qty * UNIT_WEIGHT_MAP[unitWord];
    }
  }

  // Look for USDA item whose name or category matches
  let bestMatch: FoodItem | null = null;
  let maxScore = 0;

  for (const food of usdaWholeFoods) {
    const nameLower = food.name.toLowerCase();
    const nameTokens = nameLower.split(/\s+/);
    let score = 0;

    for (const token of nameTokens) {
      if (token.length > 2 && lower.includes(token)) {
        score += token.length;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = food;
    }
  }

  if (bestMatch && maxScore >= 3) {
    const grams = parsedGrams > 0 ? parsedGrams : bestMatch.servingSizeGrams || 100;
    return { food: bestMatch, matchedGrams: grams };
  }

  return null;
}

// Decompose a multi-item or compound text query (e.g. "2 eggs, 1 avocado and 2 slices of sourdough")
export function decomposeMealText(inputText: string): MealDecompositionResult {
  const rawClean = inputText.trim();
  // Split by commas, 'and', 'with', '+', '&'
  const chunks = rawClean
    .split(/,|\band\b|\bwith\b|\+|\&/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const ingredients: DecomposedIngredient[] = [];

  for (const chunk of chunks) {
    const matched = matchIngredientToUsda(chunk);
    if (matched) {
      const nutrients = scaleNutrients(matched.food.nutrientsPer100g, matched.matchedGrams);
      ingredients.push({
        name: `${matched.food.name} (${Math.round(matched.matchedGrams)}g)`,
        matchedFoodItem: matched.food,
        quantityGrams: matched.matchedGrams,
        nutrients,
      });
    } else {
      // Create a fallback estimated ingredient based on text
      const gramMatch = chunk.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\b/);
      const estGrams = gramMatch ? parseFloat(gramMatch[1]) : 100;
      // Default reasonable nutrient estimate for generic meal component
      const fallback100g: NutrientProfile = {
        calories: 150,
        proteinGrams: 8,
        carbsGrams: 15,
        fatGrams: 6,
        fiberGrams: 2,
        vitaminA_mcg: 20,
        vitaminC_mg: 5,
        vitaminD_mcg: 0,
        vitaminB12_mcg: 0.2,
        vitaminE_mg: 0.5,
        iron_mg: 1.0,
        calcium_mg: 30,
        magnesium_mg: 20,
        potassium_mg: 180,
        sodium_mg: 200,
        zinc_mg: 0.8,
      };
      ingredients.push({
        name: `${chunk} (~${Math.round(estGrams)}g)`,
        quantityGrams: estGrams,
        nutrients: scaleNutrients(fallback100g, estGrams),
      });
    }
  }

  // If no ingredients could be parsed from chunks, create a single entry
  if (ingredients.length === 0) {
    const fallback100g: NutrientProfile = {
      calories: 350,
      proteinGrams: 20,
      carbsGrams: 35,
      fatGrams: 14,
      fiberGrams: 4,
      vitaminA_mcg: 50,
      vitaminC_mg: 10,
      vitaminD_mcg: 0.5,
      vitaminB12_mcg: 0.8,
      vitaminE_mg: 1.2,
      iron_mg: 2.5,
      calcium_mg: 80,
      magnesium_mg: 45,
      potassium_mg: 350,
      sodium_mg: 450,
      zinc_mg: 1.8,
    };
    ingredients.push({
      name: rawClean || 'Prepared Meal',
      quantityGrams: 250,
      nutrients: scaleNutrients(fallback100g, 250),
    });
  }

  const totalGrams = Math.round(ingredients.reduce((sum, item) => sum + item.quantityGrams, 0));
  const totalNutrients = sumNutrients(ingredients.map((i) => i.nutrients));

  // Compute nutrients normalized per 100g for FoodItem representation
  const nutrientsPer100g = scaleNutrients(totalNutrients, totalGrams > 0 ? (100 / totalGrams) * 100 : 100);

  const dishTitle =
    rawClean.length > 40
      ? rawClean.slice(0, 37) + '...'
      : rawClean.charAt(0).toUpperCase() + rawClean.slice(1);

  const asFoodItem: FoodItem = {
    id: `meal_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: dishTitle,
    category: 'prepared_meal',
    servingSizeGrams: totalGrams,
    servingUnitName: `1 meal (${totalGrams}g)`,
    nutrientsPer100g,
    source: 'ai_decomposed',
    hasCompleteMicros: true,
  };

  return {
    dishTitle,
    ingredients,
    totalGrams,
    totalNutrients,
    asFoodItem,
  };
}

// Preset Photo Meal Scenarios for instant camera simulation or demo
export const PHOTO_MEAL_PRESETS = [
  {
    title: 'Grilled Salmon Bowl',
    caption: 'Grilled Atlantic Salmon with Jasmine Rice & Steamed Broccoli',
    query: '180g salmon, 150g white rice, 100g broccoli, 10g olive oil',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Power Protein Breakfast',
    caption: '3 Scrambled Eggs with Avocado & Whole Grain Sourdough Toast',
    query: '3 eggs, 1 avocado, 2 slices sourdough bread',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Lean Steak & Sweet Potato',
    caption: 'Sirloin Steak with Baked Sweet Potato & Green Beans',
    query: '200g beef steak, 200g sweet potato, 80g broccoli',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
  },
  {
    title: 'Post-Workout Oats & Whey',
    caption: 'Rolled Oats with Whey Protein, Banana & Peanut Butter',
    query: '60g rolled oats, 1 scoop whey protein, 1 banana, 20g peanut butter',
    imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=400&q=80',
  },
];
