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
    sugarGrams: Math.round((nutrients100g.sugarGrams || 0) * factor * 10) / 10,
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

/**
 * Normalizes total meal nutrients to a per-100g base with high precision on calories
 * so that scaling back to `totalGrams` in the UI yields the exact `totalNutrients.calories`
 * without integer rounding drift.
 */
function normalizeToPer100g(totalNutrients: NutrientProfile, totalGrams: number): NutrientProfile {
  const factor = totalGrams > 0 ? 100 / totalGrams : 1;
  return {
    calories: Math.round(totalNutrients.calories * factor * 100) / 100,
    proteinGrams: Math.round(totalNutrients.proteinGrams * factor * 100) / 100,
    carbsGrams: Math.round(totalNutrients.carbsGrams * factor * 100) / 100,
    fatGrams: Math.round(totalNutrients.fatGrams * factor * 100) / 100,
    fiberGrams: Math.round(totalNutrients.fiberGrams * factor * 100) / 100,
    sugarGrams: Math.round((totalNutrients.sugarGrams || 0) * factor * 100) / 100,
    vitaminA_mcg: Math.round(totalNutrients.vitaminA_mcg * factor * 10) / 10,
    vitaminC_mg: Math.round(totalNutrients.vitaminC_mg * factor * 10) / 10,
    vitaminD_mcg: Math.round(totalNutrients.vitaminD_mcg * factor * 10) / 10,
    vitaminB12_mcg: Math.round(totalNutrients.vitaminB12_mcg * factor * 100) / 100,
    vitaminE_mg: Math.round(totalNutrients.vitaminE_mg * factor * 10) / 10,
    iron_mg: Math.round(totalNutrients.iron_mg * factor * 10) / 10,
    calcium_mg: Math.round(totalNutrients.calcium_mg * factor * 10) / 10,
    magnesium_mg: Math.round(totalNutrients.magnesium_mg * factor * 10) / 10,
    potassium_mg: Math.round(totalNutrients.potassium_mg * factor * 10) / 10,
    sodium_mg: Math.round(totalNutrients.sodium_mg * factor * 10) / 10,
    zinc_mg: Math.round(totalNutrients.zinc_mg * factor * 10) / 10,
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
      sugarGrams: Math.round(((acc.sugarGrams || 0) + (curr.sugarGrams || 0)) * 10) / 10,
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

const STAPLE_USDA_ALIAS_MAP: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /\b(salmon|sashimi|sake)\b/i, id: 'usda-salmon-atlantic' },
  { pattern: /\b(tuna|maguro|ahi)\b/i, id: 'usda-canned-tuna' },
  { pattern: /\b(shrimp|shrImps|prawn|prawns|ebi)\b/i, id: 'usda-shrimp' },
  { pattern: /\b(cod|halibut|tilapia|white\s*fish)\b/i, id: 'usda-cod-filet' },
  { pattern: /\b(sushi\s*rice|jasmine\s*rice|white\s*rice|steamed\s*rice|cooked\s*rice|^rice$)\b/i, id: 'usda-jasmine-rice-cooked' },
  { pattern: /\b(chicken\s*thigh|dark\s*meat\s*chicken)\b/i, id: 'usda-chicken-thigh' },
  { pattern: /\b(chicken|chicken\s*breast|grilled\s*chicken)\b/i, id: 'usda-chicken-breast' },
  { pattern: /\b(ground\s*beef|minced\s*beef|beef\s*patty|burger\s*patty)\b/i, id: 'usda-ground-beef-90-10' },
  { pattern: /\b(steak|sirloin|ribeye|beef|roast\s*beef)\b/i, id: 'usda-sirloin-steak' },
  { pattern: /\b(turkey|turkey\s*breast)\b/i, id: 'usda-turkey-breast' },
  { pattern: /\b(egg\s*white|egg\s*whites)\b/i, id: 'usda-egg-whites' },
  { pattern: /\b(egg|eggs|boiled\s*egg|fried\s*egg|poached\s*egg|scrambled\s*egg|tamago)\b/i, id: 'usda-whole-egg' },
  { pattern: /\b(greek\s*yogurt|yogurt)\b/i, id: 'usda-greek-yogurt-0' },
  { pattern: /\b(cottage\s*cheese)\b/i, id: 'usda-cottage-cheese-lowfat' },
  { pattern: /\b(whey|protein\s*powder|protein\s*shake)\b/i, id: 'usda-whey-isolate' },
  { pattern: /\b(oat|oats|oatmeal|porridge)\b/i, id: 'usda-rolled-oats' },
  { pattern: /\b(sweet\s*potato|yam)\b/i, id: 'usda-sweet-potato-baked' },
  { pattern: /\b(quinoa)\b/i, id: 'usda-quinoa-cooked' },
  { pattern: /\b(sourdough|bread|toast)\b/i, id: 'usda-sourdough-bread' },
  { pattern: /\b(broccoli)\b/i, id: 'usda-broccoli-steamed' },
  { pattern: /\b(spinach)\b/i, id: 'usda-spinach-raw' },
  { pattern: /\b(bell\s*pepper|capsicum|peppers)\b/i, id: 'usda-bell-pepper-red' },
  { pattern: /\b(asparagus)\b/i, id: 'usda-asparagus' },
  { pattern: /\b(banana|bananas)\b/i, id: 'usda-banana' },
  { pattern: /\b(blueberry|blueberries)\b/i, id: 'usda-blueberries' },
  { pattern: /\b(avocado|avocados|guacamole)\b/i, id: 'usda-avocado' },
  { pattern: /\b(apple|apples)\b/i, id: 'usda-apple' },
  { pattern: /\b(olive\s*oil|cooking\s*oil|vegetable\s*oil)\b/i, id: 'usda-olive-oil' },
  { pattern: /\b(peanut\s*butter)\b/i, id: 'usda-peanut-butter' },
  { pattern: /\b(almond|almonds)\b/i, id: 'usda-almonds-raw' },
  { pattern: /\b(black\s*beans|beans|edamame)\b/i, id: 'usda-black-beans-cooked' },
  { pattern: /\b(pasta|spaghetti|noodle|noodles|ramen\s*noodles|udon)\b/i, id: 'usda-pasta-cooked' },
  { pattern: /\b(marinara|tomato\s*sauce|pasta\s*sauce)\b/i, id: 'usda-marinara-sauce' },
  { pattern: /\b(parmesan)\b/i, id: 'usda-parmesan-cheese' },
  { pattern: /\b(cheddar|cheese|mozzarella)\b/i, id: 'usda-cheddar-cheese' },
  { pattern: /\b(milk|whole\s*milk)\b/i, id: 'usda-milk-whole' },
  { pattern: /\b(tofu|bean\s*curd)\b/i, id: 'usda-tofu-firm' },
];

// Find best matching USDA food for a single ingredient string
export function matchIngredientToUsda(text: string): { food: FoodItem; matchedGrams: number } | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  // 1. Explicit weight if specified (e.g. "250g", "0.25kg", "8oz", "1 lb")
  let parsedGrams = extractExplicitWeight(lower) || 0;

  // 2. Unit quantity if specified (e.g. "steak 2 pirces", "2 eggs", "steak 1 piece")
  const unitInfo = !parsedGrams ? extractUnitAndQuantity(lower) : null;

  const resolveGramsForFood = (food: FoodItem): number => {
    if (parsedGrams > 0) return parsedGrams;
    if (unitInfo) {
      if (unitInfo.unit === 'piece' || unitInfo.unit === 'egg') {
        const pieceWeight = extractPieceWeightFromServing(food.servingUnitName, food.servingSizeGrams || 100);
        return unitInfo.qty * pieceWeight;
      } else if (UNIT_WEIGHT_MAP[unitInfo.unit]) {
        return unitInfo.qty * UNIT_WEIGHT_MAP[unitInfo.unit];
      }
    }
    return food.servingSizeGrams || 100;
  };

  // Strip numbers and weights to check direct staple whole-food aliases first
  const textWithoutNumbers = lower
    .replace(/\b\d+(?:\.\d+)?\s*(?:g|gm|gram|grams|kg|oz|lb|lbs|piece|pieces|pcs|slice|slices|cup|cups)?\b/gi, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Do not match composite dishes (like "salmon sushi" or "chicken rice") to a single ingredient
  const isCompositePhrase =
    /\b(sushi|nigiri|maki|roll|burger|pizza|taco|burrito|sandwich|ramen|pad\s*thai|fried\s*rice|curry|cake|ice\s*cream|mochi)\b/i.test(
      textWithoutNumbers
    ) && !/\b(sushi\s*rice)\b/i.test(textWithoutNumbers);

  if (!isCompositePhrase) {
    for (const alias of STAPLE_USDA_ALIAS_MAP) {
      if (alias.pattern.test(textWithoutNumbers)) {
        const matchedFood = usdaWholeFoods.find((f) => f.id === alias.id);
        if (matchedFood) {
          return { food: matchedFood, matchedGrams: resolveGramsForFood(matchedFood) };
        }
      }
    }
  }

  // Clean numbers, punctuation, and unit stopwords from query
  const queryTokens = textWithoutNumbers
    .split(/[\s,()]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !MATCH_STOP_WORDS.has(w));

  if (queryTokens.length === 0 || isCompositePhrase) return null;

  let bestMatch: FoodItem | null = null;
  let maxScore = -1;

  for (let i = 0; i < usdaWholeFoods.length; i++) {
    const food = usdaWholeFoods[i];
    const nameLower = food.name.toLowerCase();
    const isStaple = Boolean(food.id && !food.id.startsWith('usda-sr-'));

    // Skip processed snack/candy/dough/raw-dry items in usda-sr-* unless query specifically asks for them
    if (!isStaple) {
      if (
        /\b(snacks|candies|crackers|biscuits|dough|unbaked|frozen|dry|coating|refrigerated|infant|baby)\b/i.test(
          nameLower
        ) &&
        !/\b(snack|candy|cracker|biscuit|cookie|chips|popcorn|pretzel|granola)\b/i.test(lower)
      ) {
        continue;
      }
    }

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
        }
      }
      if (matched) matchedTokensCount++;
    }

    if (matchedTokensCount > 0) {
      // Prioritize curated staple whole foods (IDs starting with 'usda-' and not 'usda-sr-')
      if (isStaple) {
        score += 35;
      } else if (matchedTokensCount < queryTokens.length) {
        // For non-staple SR items, require all query tokens to match
        continue;
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

  if (bestMatch && maxScore >= 40) {
    return { food: bestMatch, matchedGrams: resolveGramsForFood(bestMatch) };
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
  const nutrientsPer100g = normalizeToPer100g(totalNutrients, totalGrams);

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
    decomposedIngredients: ingredients,
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
 * Extracts a single total meal weight ONLY when the text is a single dish with at most 1 weight mention
 * (never when multiple ingredients each have their own weights like "180g chicken, 150g rice").
 */
function extractSingleTotalWeight(text: string): number | null {
  if (!text) return null;
  const chunks = text
    .split(/,|\band\b|\bwith\b|\+|\&/gi)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length > 1) {
    return null;
  }
  const allWeightMatches = text.match(/\b\d+(?:\.\d+)?\s*(?:g|gm|gram|grams|kg|kilo|oz|ounce|ounces|lb|lbs|pound|pounds)\b/gi);
  if (allWeightMatches && allWeightMatches.length > 1) {
    return null;
  }
  return extractExplicitWeight(text);
}

/**
 * Ensures composite dishes (like Sushi / Nigiri / Rolls) where a small vision model
 * only listed "Rice" (or only listed "Sushi") include both the protein topping and sushi rice.
 */
function expandCompositeIngredientsIfIncomplete(
  rawIngredients: any[],
  dishTitle: string,
  userHintText?: string
): any[] {
  const combinedContext = `${dishTitle} ${userHintText || ''} ${rawIngredients.map((i) => i?.name || '').join(' ')}`.toLowerCase();

  // Check if this is a sushi / nigiri / maki dish
  if (/\b(sushi|nigiri|maki)\b/i.test(combinedContext)) {
    const hasRice = rawIngredients.some((i) => /\b(rice)\b/i.test(String(i?.name || '')));
    const hasProteinOrTopping = rawIngredients.some((i) =>
      /\b(salmon|tuna|shrimp|prawn|fish|eel|unagi|crab|egg|tamago|avocado|tofu|roe|ikura)\b/i.test(
        String(i?.name || '')
      )
    );

    const fishName = /\b(tuna|maguro)\b/i.test(combinedContext)
      ? 'Tuna'
      : /\b(shrimp|prawn|ebi)\b/i.test(combinedContext)
      ? 'Steamed Shrimp'
      : 'Atlantic Salmon';

    // Case 1: Model returned a single ingredient named "Sushi" or "Salmon Sushi"
    if (rawIngredients.length === 1 && !hasRice && !hasProteinOrTopping) {
      const totalG = Math.max(80, Number(rawIngredients[0]?.quantityGrams) || 200);
      const fishG = Math.round(totalG * 0.4);
      const riceG = Math.round(totalG * 0.6);
      return [
        { name: fishName, quantityGrams: fishG },
        { name: 'Sushi Rice', quantityGrams: riceG },
      ];
    }

    // Case 2: Model returned only "Rice" for a Sushi dish (forgot the fish topping!)
    if (hasRice && !hasProteinOrTopping) {
      const riceIng = rawIngredients.find((i) => /\b(rice)\b/i.test(String(i?.name || '')));
      const riceG = Math.max(60, Math.min(180, Number(riceIng?.quantityGrams) || 120));
      if (riceIng) riceIng.quantityGrams = riceG;
      const fishG = Math.round(riceG * 0.65); // e.g. ~80g salmon for 120g sushi rice
      return [{ name: fishName, quantityGrams: fishG }, ...rawIngredients];
    }

    // Case 3: Model returned only the fish for a Sushi dish (forgot the sushi rice!)
    if (hasProteinOrTopping && !hasRice) {
      const fishIng = rawIngredients[0];
      const fishG = Math.max(40, Number(fishIng?.quantityGrams) || 80);
      const riceG = Math.round(fishG * 1.4);
      return [...rawIngredients, { name: 'Sushi Rice', quantityGrams: riceG }];
    }
  }

  return rawIngredients;
}

/**
 * Builds a verified `MealDecompositionResult` from Vision AI or Text AI JSON output.
 * Matches whole-food ingredients against curated cooked USDA staples for lab-verified
 * calories, macros, and micronutrients, while falling back to sanity-checked AI macros for custom items.
 */
export function buildDecompositionFromAiJson(
  parsed: any,
  fallbackTitle = 'Analyzed Meal',
  userHintText?: string
): MealDecompositionResult | null {
  if (!parsed || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
    return null;
  }

  const rawDishTitle = String(parsed.dishTitle || fallbackTitle || 'Analyzed Meal').trim();
  const expandedRawIngredients = expandCompositeIngredientsIfIncomplete(
    parsed.ingredients,
    rawDishTitle,
    userHintText
  );

  const hintClean = (userHintText || '').trim();
  const singleExplicitTotalWeight = extractSingleTotalWeight(hintClean);
  const inputChunks = hintClean
    ? hintClean
        .split(/,|\band\b|\bwith\b|\+|\&/gi)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const ingredients: DecomposedIngredient[] = expandedRawIngredients.map((ing: any) => {
    const rawAiGrams = Math.max(1, Number(ing.quantityGrams) || Number(ing.grams) || Number(ing.weightGrams) || 100);
    let quantityGrams = rawAiGrams;
    const rawIngName = String(ing.name || ing.ingredient || 'Food Item').trim();
    const cleanIngName = rawIngName.replace(/\s*\(\s*\d+(?:\.\d+)?\s*g\s*\)\s*$/i, '').trim() || rawIngName;

    // If user hint explicitly specified a weight for this specific chunk, honor it
    if (inputChunks.length > 0) {
      const matchingChunk = inputChunks.find((c) => {
        const cLower = c.toLowerCase();
        const ingLower = cleanIngName.toLowerCase();
        return (
          cLower.includes(ingLower) ||
          ingLower.includes(cLower) ||
          ingLower.split(/\s+/).some((w) => w.length > 3 && cLower.includes(w))
        );
      });
      if (matchingChunk) {
        const chunkWeight = extractExplicitWeight(matchingChunk);
        if (chunkWeight !== null && chunkWeight > 0) {
          quantityGrams = chunkWeight;
        }
      }
    }

    // 1. Check if this ingredient matches a curated cooked USDA whole food for exact lab-verified macros & micronutrients
    const usdaMatch = matchIngredientToUsda(cleanIngName);
    if (usdaMatch) {
      const nutrients = scaleNutrients(usdaMatch.food.nutrientsPer100g, quantityGrams);
      return {
        name: usdaMatch.food.name,
        matchedFoodItem: usdaMatch.food,
        quantityGrams: Math.round(quantityGrams),
        nutrients,
      };
    }

    // 2. Otherwise use AI macros with physical density bounds so 2B models can never hallucinate impossible numbers
    const scale = rawAiGrams > 0 ? quantityGrams / rawAiGrams : 1;

    const proteinGrams = Math.min(
      Math.round(quantityGrams * 0.4 * 10) / 10,
      Math.max(0, Math.round(((Number(ing.proteinGrams ?? ing.protein) || 0) * scale) * 10) / 10)
    );
    const carbsGrams = Math.min(
      Math.round(quantityGrams * 0.85 * 10) / 10,
      Math.max(0, Math.round(((Number(ing.carbsGrams ?? ing.carbs) || 0) * scale) * 10) / 10)
    );
    const fatGrams = Math.min(
      Math.round(quantityGrams * 1.0 * 10) / 10,
      Math.max(0, Math.round(((Number(ing.fatGrams ?? ing.fat) || 0) * scale) * 10) / 10)
    );
    const fiberGrams = Math.min(
      carbsGrams,
      Math.max(0, Math.round(((Number(ing.fiberGrams ?? ing.fiber) || 0) * scale) * 10) / 10)
    );
    const sugarGrams = Math.min(
      carbsGrams,
      Math.max(0, Math.round(((Number(ing.sugarGrams ?? ing.sugar) || 0) * scale) * 10) / 10)
    );

    let calories = Math.max(0, Math.round((Number(ing.calories ?? ing.kcal) || 0) * scale));
    const macroDerivedCals = Math.round(proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9);

    if (macroDerivedCals > 0) {
      if (calories <= 0 || calories > macroDerivedCals * 1.5 || calories < macroDerivedCals * 0.65) {
        calories = macroDerivedCals;
      }
    }

    const nutrients: NutrientProfile = {
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      fiberGrams,
      sugarGrams,
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
      name: cleanIngName,
      quantityGrams: Math.round(quantityGrams),
      nutrients,
    };
  });

  // If the user explicitly typed a single total weight for a single-ingredient meal (e.g. "steak 250g"), enforce it
  if (singleExplicitTotalWeight !== null && ingredients.length === 1) {
    const ing = ingredients[0];
    if (ing.quantityGrams !== singleExplicitTotalWeight && ing.quantityGrams > 0) {
      const scale = singleExplicitTotalWeight / ing.quantityGrams;
      ing.quantityGrams = singleExplicitTotalWeight;
      if (ing.matchedFoodItem) {
        ing.nutrients = scaleNutrients(ing.matchedFoodItem.nutrientsPer100g, singleExplicitTotalWeight);
      } else {
        ing.nutrients = {
          ...ing.nutrients,
          calories: Math.round(ing.nutrients.calories * scale),
          proteinGrams: Math.round(ing.nutrients.proteinGrams * scale * 10) / 10,
          carbsGrams: Math.round(ing.nutrients.carbsGrams * scale * 10) / 10,
          fatGrams: Math.round(ing.nutrients.fatGrams * scale * 10) / 10,
          fiberGrams: Math.round(ing.nutrients.fiberGrams * scale * 10) / 10,
          sugarGrams: Math.round((ing.nutrients.sugarGrams || 0) * scale * 10) / 10,
        };
      }
    }
  }

  const calculatedGrams = Math.round(ingredients.reduce((sum, item) => sum + item.quantityGrams, 0));
  const totalGrams = calculatedGrams > 0 ? calculatedGrams : Math.max(10, Number(parsed.totalGrams) || 100);
  const totalNutrients = sumNutrients(ingredients.map((i) => i.nutrients));
  const nutrientsPer100g = normalizeToPer100g(totalNutrients, totalGrams);

  const dishTitle = rawDishTitle.length > 50 ? rawDishTitle.slice(0, 47) + '...' : rawDishTitle;
  const hasCompleteMicros = ingredients.some((i) => !!i.matchedFoodItem);

  const asFoodItem: FoodItem = {
    id: `ai_meal_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: dishTitle,
    category: 'prepared_meal',
    servingSizeGrams: totalGrams,
    servingUnitName: `1 meal (${totalGrams}g)`,
    nutrientsPer100g,
    source: 'ai_decomposed',
    hasCompleteMicros,
    decomposedIngredients: ingredients,
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
 * Recomputes a `MealDecompositionResult` when the user edits an individual ingredient's weight
 * or removes an ingredient in the Review modal.
 */
export function recomputeDecompositionWithUpdatedIngredients(
  prev: MealDecompositionResult,
  updatedIngredients: DecomposedIngredient[]
): MealDecompositionResult {
  const totalGrams = Math.max(
    1,
    Math.round(updatedIngredients.reduce((sum, item) => sum + item.quantityGrams, 0))
  );
  const totalNutrients = sumNutrients(updatedIngredients.map((i) => i.nutrients));
  const nutrientsPer100g = normalizeToPer100g(totalNutrients, totalGrams);

  const asFoodItem: FoodItem = {
    ...prev.asFoodItem,
    servingSizeGrams: totalGrams,
    servingUnitName: `1 meal (${totalGrams}g)`,
    nutrientsPer100g,
    decomposedIngredients: updatedIngredients,
  };

  return {
    ...prev,
    ingredients: updatedIngredients,
    totalGrams,
    totalNutrients,
    asFoodItem,
  };
}

/**
 * Parses a raw Vision AI response (JSON or fallback text) into a `MealDecompositionResult`.
 */
export function parseVisionMealResponse(
  rawVisionOutput: string,
  userHintText?: string
): MealDecompositionResult | null {
  if (!rawVisionOutput) return null;
  const cleaned = rawVisionOutput
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && parsed.error === 'UNIDENTIFIED') {
        return null;
      }
      const decomp = buildDecompositionFromAiJson(parsed, 'Scanned Meal', userHintText);
      if (decomp) {
        return decomp;
      }
    } catch (e) {
      console.warn('[MealDecomposer] Failed to parse vision JSON directly:', e);
    }
  }
  return null;
}

/**
 * Decomposes meal descriptions using on-device AI or active cloud LLM,
 * trusting the AI's realistic cooked weights and calories/macros.
 */
export async function decomposeMealWithGemma(
  inputText: string
): Promise<MealDecompositionResult> {
  const clean = inputText.trim();
  if (!clean) {
    return decomposeMealText('Prepared Meal');
  }

  // If the input is already JSON from a vision model, parse it directly
  const directVisionDecomp = parseVisionMealResponse(clean);
  if (directVisionDecomp) {
    return directVisionDecomp;
  }

  try {
    const singleExplicitWeight = extractSingleTotalWeight(clean);
    const weightHint = singleExplicitWeight
      ? `The user specified a portion weight of ${singleExplicitWeight}g. Use ${singleExplicitWeight}g as the total meal weight.`
      : 'Estimate realistic COOKED/PREPARED portion weights in grams for each item (do NOT use raw dry grain/pasta weights or raw dry calories).';

    const prompt = `You are ZeroCoach, an expert sports nutritionist. Analyze this meal description: "${clean}".
${weightHint}
List EVERY distinct ingredient in the meal separately (e.g., for sushi list both the fish topping and sushi rice; for steak and eggs list both steak and eggs).
Calculate accurate COOKED calories and macronutrients for the exact gram weight of each ingredient (verify that calories ≈ 4*proteinGrams + 4*carbsGrams + 9*fatGrams).
Return ONLY a valid JSON object with NO markdown formatting and NO backticks:
{
  "dishTitle": "<Concise Dish Title>",
  "totalGrams": <sum of all ingredient quantityGrams>,
  "ingredients": [
    {
      "name": "<Primary protein or main component>",
      "quantityGrams": <cooked weight in grams>,
      "calories": <calories for this quantityGrams>,
      "proteinGrams": <protein in grams>,
      "carbsGrams": <carbs in grams>,
      "fatGrams": <fat in grams>,
      "fiberGrams": <fiber in grams>,
      "sugarGrams": <sugar in grams>
    },
    {
      "name": "<Carb, side, or secondary component>",
      "quantityGrams": <cooked weight in grams>,
      "calories": <calories for this quantityGrams>,
      "proteinGrams": <protein in grams>,
      "carbsGrams": <carbs in grams>,
      "fatGrams": <fat in grams>,
      "fiberGrams": <fiber in grams>,
      "sugarGrams": <sugar in grams>
    }
  ]
}`;

    let fullOutput = '';
    const res = await llmService.streamCompletion(
      {
        systemPrompt:
          'You are ZeroCoach, an athletic coach and clinical sports nutritionist. Always output valid JSON strictly following the schema without markdown or conversational filler.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 450,
      },
      (token) => {
        fullOutput += token;
      }
    );

    const rawText = (fullOutput || res.fullText || '').trim();
    const aiDecomp = parseVisionMealResponse(rawText, clean);
    if (aiDecomp) {
      return aiDecomp;
    }
  } catch (err) {
    console.warn('[GemmaMealDecomposer] AI inference error, falling back to USDA heuristics:', err);
  }

  // Graceful fallback to bundled USDA database matcher only if LLM is offline/unavailable
  return decomposeMealText(clean);
}

/**
 * Synchronous helper for `LoggedFoodDetailModal`:
 * Returns `food.decomposedIngredients` if present (and expands single-item composite dishes),
 * or derives USDA decomposed ingredients on-the-fly for legacy `ai_decomposed` logged meals.
 */
export function getDecomposedIngredientsForLoggedFood(food: {
  name: string;
  consumedGrams: number;
  source?: string;
  decomposedIngredients?: DecomposedIngredient[];
}): DecomposedIngredient[] {
  if (food.decomposedIngredients && food.decomposedIngredients.length > 0) {
    return food.decomposedIngredients;
  }
  if (food.source !== 'ai_decomposed') {
    return [];
  }
  const grams = Math.max(10, Math.round(food.consumedGrams || 100));
  const syntheticDecomp = buildDecompositionFromAiJson(
    {
      dishTitle: food.name,
      totalGrams: grams,
      ingredients: [{ name: food.name, quantityGrams: grams }],
    },
    food.name,
    food.name
  );
  if (syntheticDecomp && syntheticDecomp.ingredients.length > 0) {
    return syntheticDecomp.ingredients;
  }
  const fallback = decomposeMealText(`${food.name} ${grams}g`);
  return fallback.ingredients || [];
}

