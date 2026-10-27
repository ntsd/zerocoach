import { FoodItem, NutrientProfile, FoodCategory } from '../../types/nutrition';
import { usdaWholeFoods } from './openFoodFactsService';
import { llmService } from '../llm/llmService';

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

/**
 * Extracts explicit weight in grams from user input if present.
 * Supports:
 * - Grams: "250g", "250 g", "250 gram", "250 grams", "250gm"
 * - Kilograms: "0.25kg", "0.25 kg", "1 kilo", "1 kilogram"
 * - Ounces: "8oz", "8 oz", "8 ounce", "8 ounces"
 * - Pounds: "1 lb", "0.5 lb", "1 pound", "1.5 lbs"
 */
export function extractExplicitWeight(text: string): number | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Match e.g. "250g", "250 g", "250 gram", "250 grams", "250gm"
  const gramMatch = lower.match(/(?:^|\b)(\d+(?:\.\d+)?)\s*(?:g|gm|gram|grams)\b/i);
  if (gramMatch) {
    const val = parseFloat(gramMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 5000) return Math.round(val);
  }

  // Match e.g. "0.25kg", "0.25 kg", "1 kilo", "1 kilogram"
  const kgMatch = lower.match(/(?:^|\b)(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram|kilograms)\b/i);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 10) return Math.round(val * 1000);
  }

  // Match e.g. "8oz", "8 oz", "8 ounce", "8 ounces"
  const ozMatch = lower.match(/(?:^|\b)(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)\b/i);
  if (ozMatch) {
    const val = parseFloat(ozMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 100) return Math.round(val * 28.3495);
  }

  // Match e.g. "1 lb", "0.5 lb", "1 pound", "1.5 lbs"
  const lbMatch = lower.match(/(?:^|\b)(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/i);
  if (lbMatch) {
    const val = parseFloat(lbMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 20) return Math.round(val * 453.592);
  }

  return null;
}

// Normalizes common typos and variations for unit words
const UNIT_TYPO_MAP: Record<string, string> = {
  pirces: 'piece',
  pirce: 'piece',
  peices: 'piece',
  peice: 'piece',
  pices: 'piece',
  pice: 'piece',
  piece: 'piece',
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  filet: 'piece',
  filets: 'piece',
  fillet: 'piece',
  fillets: 'piece',
  steak: 'piece',
  steaks: 'piece',
  patty: 'piece',
  patties: 'piece',
  egg: 'egg',
  eggs: 'egg',
  slice: 'slice',
  slices: 'slice',
  can: 'can',
  cans: 'can',
  cup: 'cup',
  cups: 'cup',
  scoop: 'scoop',
  scoops: 'scoop',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
};

/**
 * Extracts the single piece / unit weight from USDA serving unit description
 * e.g. "100g (or 1 steak ~200g)" -> 200g
 * e.g. "100g (~2 large eggs)" -> 50g
 * e.g. "100g (or 1 palm-sized filet ~150g)" -> 150g
 */
export function extractPieceWeightFromServing(servingUnitName?: string, fallbackGrams = 100): number {
  if (!servingUnitName) return fallbackGrams;

  // Pattern 1: e.g. '100g (~2 large eggs)' -> 100 / 2 = 50g
  const eggMultiMatch = servingUnitName.match(/100g\s*\(\s*~\s*(\d+)\s+large\s+eggs?\s*\)/i);
  if (eggMultiMatch) {
    const count = parseInt(eggMultiMatch[1], 10);
    return count > 0 ? Math.round(100 / count) : 50;
  }

  // Pattern 2: e.g. '1/2 medium avocado ~75g' -> whole avocado ~150g
  const halfMatch = servingUnitName.match(/1\/2\s+[a-z\s]+~(\d+)g/i);
  if (halfMatch) {
    return parseInt(halfMatch[1], 10) * 2;
  }

  // Pattern 3: e.g. '~200g', 'filet ~150g', 'thigh ~90g', 'banana ~118g'
  const tildeMatch = servingUnitName.match(/~(\d+)\s*g/i);
  if (tildeMatch) {
    return parseInt(tildeMatch[1], 10);
  }

  return fallbackGrams;
}

/**
 * Extracts unit count and unit word from input text with typo tolerance
 * e.g. "steak 2 pirces" -> { qty: 2, unit: 'piece' }
 * e.g. "2 pieces steak" -> { qty: 2, unit: 'piece' }
 * e.g. "steak 2 pcs" -> { qty: 2, unit: 'piece' }
 * e.g. "2 eggs" -> { qty: 2, unit: 'egg' }
 */
export function extractUnitAndQuantity(text: string): { qty: number; unit: string } | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  const unitPattern = Object.keys(UNIT_TYPO_MAP).join('|');

  // Match 1: '<qty> <unit>' anywhere e.g. '2 pirces', '1 piece', '2 pcs', '2 eggs'
  const match1 = lower.match(new RegExp('\\b(\\d+(?:\\.\\d+)?)\\s*(?:x\\s*)?(' + unitPattern + ')\\b', 'i'));
  if (match1) {
    const rawUnit = match1[2].toLowerCase();
    return { qty: parseFloat(match1[1]), unit: UNIT_TYPO_MAP[rawUnit] || rawUnit };
  }

  // Match 2: '<unit> <qty>' e.g. 'pieces 2'
  const match2 = lower.match(new RegExp('\\b(' + unitPattern + ')\\s+(\\d+(?:\\.\\d+)?)\\b', 'i'));
  if (match2) {
    const rawUnit = match2[1].toLowerCase();
    return { qty: parseFloat(match2[2]), unit: UNIT_TYPO_MAP[rawUnit] || rawUnit };
  }

  // Match 3: '<qty>x' e.g. '2x'
  const match3 = lower.match(/\b(\d+(?:\.\d+)?)\s*x\b/i);
  if (match3) {
    return { qty: parseFloat(match3[1]), unit: 'piece' };
  }

  // Match 4: trailing number e.g. 'steak 2', 'egg 3'
  const match4 = lower.match(/\b([a-z]+)\s+(\d+(?:\.\d+)?)$/i);
  if (match4 && !['g', 'gm', 'gram', 'grams', 'kg', 'oz', 'lb', 'lbs'].includes(match4[1])) {
    return { qty: parseFloat(match4[2]), unit: 'piece' };
  }

  // Match 5: leading number e.g. '2 steak'
  const match5 = lower.match(/^(\d+(?:\.\d+)?)\s+([a-z]+)$/i);
  if (match5 && !['g', 'gm', 'gram', 'grams', 'kg', 'oz', 'lb', 'lbs'].includes(match5[2])) {
    return { qty: parseFloat(match5[1]), unit: 'piece' };
  }

  return null;
}

const MATCH_STOP_WORDS = new Set([
  'cooked', 'raw', 'fresh', 'large', 'medium', 'small', 'cup', 'cups',
  'piece', 'pieces', 'slice', 'slices', 'dish', 'dishes', 'bowl', 'bowls',
  'plate', 'plates', 'serving', 'servings', 'scoop', 'scoops', 'tbsp', 'tsp',
  'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'can', 'cans',
  'gram', 'grams', 'g', 'kg', 'oz', 'lb', 'lbs', 'or', 'and', 'with', 'the', 'of', 'in', 'on', 'a', 'an'
]);

// Find best matching USDA food for a single ingredient string
export function matchIngredientToUsda(text: string): { food: FoodItem; matchedGrams: number } | null {
  const lower = text.toLowerCase().trim();

  // 1. Explicit weight if specified (e.g. "250g", "0.25kg", "8oz", "1 lb")
  let parsedGrams = extractExplicitWeight(lower) || 0;

  // 2. Unit quantity if specified (e.g. "steak 2 pirces", "2 eggs", "steak 1 piece")
  const unitInfo = !parsedGrams ? extractUnitAndQuantity(lower) : null;

  // Clean numbers, punctuation, and unit stopwords from query
  const queryTokens = lower
    .replace(/[0-9.]+/g, ' ')
    .split(/[\s,()]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !MATCH_STOP_WORDS.has(w));

  let bestMatch: FoodItem | null = null;
  let maxScore = -1;

  for (let i = 0; i < usdaWholeFoods.length; i++) {
    const food = usdaWholeFoods[i];
    const nameLower = food.name.toLowerCase();
    const nameTokens = new Set(nameLower.split(/[\s,()\/]+/).filter((w) => w.length > 2));

    let score = 0;
    let matchedTokensCount = 0;

    for (const qToken of queryTokens) {
      let matched = false;
      for (const nToken of nameTokens) {
        if (nToken === qToken) {
          score += 20 + qToken.length * 2;
          matched = true;
          break;
        } else if (nToken === qToken + 's' || qToken === nToken + 's') {
          score += 15 + qToken.length * 2;
          matched = true;
          break;
        } else if (nToken.startsWith(qToken) || qToken.startsWith(nToken)) {
          if (Math.min(nToken.length, qToken.length) >= 4) {
            score += 10;
            matched = true;
            break;
          }
        }
      }
      if (matched) matchedTokensCount++;
    }

    if (matchedTokensCount > 0) {
      // Prioritize curated staple whole foods (IDs starting with 'usda-' and not 'usda-sr-')
      if (food.id && !food.id.startsWith('usda-sr-')) {
        score += 30;
      }
      // Bonus if all query tokens matched
      if (matchedTokensCount === queryTokens.length) {
        score += 25;
      }
      // If query does not mention 'white' / 'whites', penalize egg whites over whole eggs
      if (!lower.includes('white') && nameLower.includes('white') && lower.includes('egg')) {
        score -= 20;
      }
      // Penalize excessively long processed product titles for simple queries
      score -= Math.min(nameTokens.size, 15);

      if (score > maxScore) {
        maxScore = score;
        bestMatch = food;
      }
    }
  }

  if (bestMatch && maxScore >= 5) {
    if (!parsedGrams && unitInfo) {
      if (unitInfo.unit === 'piece' || unitInfo.unit === 'egg') {
        const pieceWeight = extractPieceWeightFromServing(bestMatch.servingUnitName, bestMatch.servingSizeGrams || 100);
        parsedGrams = unitInfo.qty * pieceWeight;
      } else if (UNIT_WEIGHT_MAP[unitInfo.unit]) {
        parsedGrams = unitInfo.qty * UNIT_WEIGHT_MAP[unitInfo.unit];
      }
    }

    const grams = parsedGrams > 0 ? parsedGrams : (bestMatch.servingSizeGrams || 100);
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
      const explicitGrams = extractExplicitWeight(chunk);
      const estGrams = explicitGrams !== null ? explicitGrams : 100;
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
    const singleExplicit = extractExplicitWeight(rawClean);
    const fallbackGrams = singleExplicit !== null ? singleExplicit : 250;
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
      quantityGrams: fallbackGrams,
      nutrients: scaleNutrients(fallback100g, fallbackGrams),
    });
  }

  const totalGrams = Math.round(ingredients.reduce((sum, item) => sum + item.quantityGrams, 0));
  const totalNutrients = sumNutrients(ingredients.map((i) => i.nutrients));

  // Compute nutrients normalized per 100g for FoodItem representation
  const nutrientsPer100g = scaleNutrients(totalNutrients, totalGrams > 0 ? (100 / totalGrams) * 100 : 100);

  const dishTitle =
    ingredients.length === 1 && ingredients[0].matchedFoodItem
      ? ingredients[0].matchedFoodItem.name
      : rawClean.length > 40
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

/**
 * Decomposes meal descriptions using Gemma 4 E2B on-device model,
 * with graceful fallback to USDA whole food heuristics.
 */
export async function decomposeMealWithGemma(
  inputText: string
): Promise<MealDecompositionResult> {
  const clean = inputText.trim();
  if (!clean) {
    return decomposeMealText('Prepared Meal');
  }

  // FAST-PATH: If all components directly match bundled USDA foods with complete confidence,
  // return the USDA decomposition immediately (< 5ms, 0 battery, no hallucination, exact micros).
  const directDecomp = decomposeMealText(clean);
  const allMatched =
    directDecomp.ingredients.length > 0 &&
    directDecomp.ingredients.every((i) => !!i.matchedFoodItem);

  if (allMatched) {
    return directDecomp;
  }

  try {
    const explicitWeight = extractExplicitWeight(clean);
    const weightHint = explicitWeight
      ? `CRITICAL INSTRUCTION: The user explicitly stated an exact portion weight of ${explicitWeight}g. You MUST set "totalGrams": ${explicitWeight} and ensure the sum of ingredient quantityGrams equals ${explicitWeight}g.`
      : 'Estimate the weight in grams realistically based on standard portion sizes.';

    const prompt = `You are ZeroCoach, an on-device sports nutrition AI. Analyze this meal description: "${clean}".
${weightHint}
Return ONLY a valid JSON object with NO markdown formatting and NO backticks. Follow this exact structure:
{
  "dishTitle": "<Dish name>",
  "totalGrams": <number representing total weight in grams>,
  "ingredients": [
    {
      "name": "<Ingredient name>",
      "quantityGrams": <weight of this ingredient in grams>,
      "calories": <calories for this ingredient quantity>,
      "proteinGrams": <protein for this ingredient quantity>,
      "carbsGrams": <carbs for this ingredient quantity>,
      "fatGrams": <fat for this ingredient quantity>,
      "fiberGrams": <fiber for this ingredient quantity>
    }
  ]
}`;

    let fullOutput = '';
    const res = await llmService.streamCompletion(
      {
        systemPrompt:
          'You are ZeroCoach, an athletic coach and nutritionist. Always output valid JSON strictly following the schema without markdown or conversational filler.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        maxTokens: 350,
      },
      (token) => {
        fullOutput += token;
      }
    );

    const rawText = (fullOutput || res.fullText || '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) {
        // Split clean user text into chunks to cross-reference explicit weights per chunk
        const inputChunks = clean
          .split(/,|\band\b|\bwith\b|\+|\&/gi)
          .map((s) => s.trim())
          .filter(Boolean);

        const ingredients: DecomposedIngredient[] = parsed.ingredients.map((ing: any) => {
          let quantityGrams = Number(ing.quantityGrams) || 100;
          const ingName = String(ing.name || 'Ingredient');

          // Check if ingredient name contains explicit weight (e.g. "Steak 250g")
          const ingExplicitWeight = extractExplicitWeight(ingName);
          if (ingExplicitWeight !== null) {
            quantityGrams = ingExplicitWeight;
          } else {
            // Check if one of the user's input chunks matches this ingredient and had an explicit weight
            const matchingChunk = inputChunks.find((c) => {
              const cLower = c.toLowerCase();
              const ingLower = ingName.toLowerCase();
              return (
                cLower.includes(ingLower) ||
                ingLower.includes(cLower) ||
                ingLower.split(/\s+/).some((w) => w.length > 3 && cLower.includes(w))
              );
            });
            if (matchingChunk) {
              const chunkWeight = extractExplicitWeight(matchingChunk);
              if (chunkWeight !== null) {
                quantityGrams = chunkWeight;
              }
            }
          }

          // Check if we can match against USDA whole foods database for lab-verified micro/macronutrients
          const usdaMatch = matchIngredientToUsda(ingName) || matchIngredientToUsda(clean);
          let nutrients: NutrientProfile;

          if (usdaMatch) {
            nutrients = scaleNutrients(usdaMatch.food.nutrientsPer100g, quantityGrams);
            return {
              name: `${usdaMatch.food.name} (${Math.round(quantityGrams)}g)`,
              matchedFoodItem: usdaMatch.food,
              quantityGrams,
              nutrients,
            };
          }

          // Otherwise use model's estimated nutrients scaled to quantityGrams
          const rawGrams = Number(ing.quantityGrams) || 100;
          const scale = rawGrams > 0 ? quantityGrams / rawGrams : 1;

          nutrients = {
            calories: Math.round((Number(ing.calories) || 0) * scale),
            proteinGrams: Math.round(((Number(ing.proteinGrams) || 0) * scale) * 10) / 10,
            carbsGrams: Math.round(((Number(ing.carbsGrams) || 0) * scale) * 10) / 10,
            fatGrams: Math.round(((Number(ing.fatGrams) || 0) * scale) * 10) / 10,
            fiberGrams: Math.round(((Number(ing.fiberGrams) || 0) * scale) * 10) / 10,
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
          };

          return {
            name: ingName,
            quantityGrams,
            nutrients,
          };
        });

        // If the user's input specified an explicit weight and there is only 1 ingredient (e.g. "steak 250g"),
        // strictly enforce that user weight even if the model hallucinated a default portion.
        if (explicitWeight !== null && ingredients.length === 1) {
          const ing = ingredients[0];
          if (ing.quantityGrams !== explicitWeight) {
            const scale = ing.quantityGrams > 0 ? explicitWeight / ing.quantityGrams : 1;
            ing.quantityGrams = explicitWeight;
            if (ing.matchedFoodItem) {
              ing.nutrients = scaleNutrients(ing.matchedFoodItem.nutrientsPer100g, explicitWeight);
              ing.name = `${ing.matchedFoodItem.name} (${Math.round(explicitWeight)}g)`;
            } else {
              ing.nutrients = {
                calories: Math.round(ing.nutrients.calories * scale),
                proteinGrams: Math.round(ing.nutrients.proteinGrams * scale * 10) / 10,
                carbsGrams: Math.round(ing.nutrients.carbsGrams * scale * 10) / 10,
                fatGrams: Math.round(ing.nutrients.fatGrams * scale * 10) / 10,
                fiberGrams: Math.round(ing.nutrients.fiberGrams * scale * 10) / 10,
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
              };
            }
          }
        }

        const calculatedGrams = Math.round(ingredients.reduce((sum, item) => sum + item.quantityGrams, 0));
        const totalGrams =
          explicitWeight !== null && ingredients.length === 1
            ? explicitWeight
            : (calculatedGrams > 0 ? calculatedGrams : (Number(parsed.totalGrams) || 100));

        const totalNutrients = sumNutrients(ingredients.map((i) => i.nutrients));
        const nutrientsPer100g = scaleNutrients(
          totalNutrients,
          totalGrams > 0 ? (100 / totalGrams) * 100 : 100
        );

        const dishTitle =
          String(parsed.dishTitle || clean).slice(0, 45);

        const hasCompleteMicros = ingredients.some((i) => !!i.matchedFoodItem);

        const asFoodItem: FoodItem = {
          id: `gemma_meal_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: dishTitle,
          category: 'prepared_meal',
          servingSizeGrams: totalGrams,
          servingUnitName: `1 meal (${totalGrams}g)`,
          nutrientsPer100g,
          source: 'ai_decomposed',
          hasCompleteMicros,
        };

        return {
          dishTitle,
          ingredients,
          totalGrams,
          totalNutrients,
          asFoodItem,
        };
      }
    }
  } catch (err) {
    console.warn('[GemmaMealDecomposer] Gemma inference error, falling back to USDA heuristics:', err);
  }

  // Graceful fallback to bundled USDA database matcher
  return decomposeMealText(clean);
}
