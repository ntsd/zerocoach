import { FoodItem, NutrientProfile } from '@/types/nutrition';
import { OpenAICompatibleConfig } from '@/types/model';

/**
 * Open Food Facts NutriSight Schema
 * Corresponds to openfoodfacts/nutrition-extractor (LayoutLMv3 token classification).
 */
export interface ExtractedNutritionData {
  productName: string;
  brand?: string;
  servingSizeGrams: number;
  servingUnitName: string;
  isPer100g?: boolean;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  saturatedFatGrams?: number;
  fiberGrams?: number;
  sugarsGrams?: number;
  sodiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  potassiumMg?: number;
  vitaminAMcg?: number;
  vitaminCMg?: number;
  vitaminDMcg?: number;
  vitaminB12Mcg?: number;
}

export interface LabelExtractionResult {
  success: boolean;
  data?: ExtractedNutritionData;
  asFoodItem?: FoodItem;
  rawText?: string;
  source: 'openfoodfacts_nutrisight' | 'label_parser' | 'failed';
  errorMessage?: string;
}

/**
 * Builds a standardized FoodItem from extracted nutrition label data.
 * Normalizes nutrients to 100g base so portion scaling in review sheet remains mathematically exact.
 */
export function buildFoodItemFromLabel(
  data: ExtractedNutritionData,
  imageUri?: string
): FoodItem {
  const servingGrams = data.servingSizeGrams > 0 ? data.servingSizeGrams : 100;
  const servingUnit = data.servingUnitName || `${servingGrams}g`;

  // If numbers extracted are per serving and serving is not 100g, normalize to 100g
  const isPerServing = data.isPer100g === false || (!data.isPer100g && servingGrams !== 100);
  const factor = isPerServing && servingGrams > 0 ? 100 / servingGrams : 1;

  const nutrients: NutrientProfile = {
    calories: Math.max(0, Math.round(data.calories * factor)),
    proteinGrams: Math.max(0, Math.round(data.proteinGrams * factor * 10) / 10),
    carbsGrams: Math.max(0, Math.round(data.carbsGrams * factor * 10) / 10),
    fatGrams: Math.max(0, Math.round(data.fatGrams * factor * 10) / 10),
    fiberGrams: Math.max(0, Math.round((data.fiberGrams || 0) * factor * 10) / 10),
    vitaminA_mcg: Math.round((data.vitaminAMcg || 0) * factor),
    vitaminC_mg: Math.round((data.vitaminCMg || 0) * factor * 10) / 10,
    vitaminD_mcg: Math.round((data.vitaminDMcg || 0) * factor * 10) / 10,
    vitaminB12_mcg: Math.round((data.vitaminB12Mcg || 0) * factor * 100) / 100,
    vitaminE_mg: 0,
    iron_mg: Math.round((data.ironMg || 0) * factor * 10) / 10,
    calcium_mg: Math.round((data.calciumMg || 0) * factor),
    magnesium_mg: 0,
    potassium_mg: Math.round((data.potassiumMg || 0) * factor),
    sodium_mg: Math.round((data.sodiumMg || 0) * factor),
    zinc_mg: 0,
  };

  return {
    id: `off-label-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: data.productName || 'Scanned Nutrition Label',
    brand: data.brand || 'Open Food Facts NutriSight',
    category: 'packaged_goods',
    servingSizeGrams: servingGrams,
    servingUnitName: servingUnit,
    nutrientsPer100g: nutrients,
    source: 'open_food_facts',
    imageUrl: imageUri,
    hasCompleteMicros: (data.sodiumMg || 0) > 0 || (data.calciumMg || 0) > 0,
    servingQuantityGrams: servingGrams,
    offQuantity: servingUnit,
  };
}

/**
 * Parses raw text extracted from a nutrition table label using robust heuristics.
 * Matches standard US/EU/Asian nutrition table formats.
 */
export function parseNutritionLabelText(rawText: string): LabelExtractionResult {
  if (!rawText || rawText.trim().length === 0) {
    return {
      success: false,
      source: 'failed',
      errorMessage: 'No text provided to parse.',
    };
  }

  const text = rawText.toLowerCase();

  // Helper regex finders
  const findValue = (patterns: RegExp[]): number => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  };

  // Calories / Energy (prioritize explicit kcal, then 'calories: N', then kJ converted to kcal)
  let calories = 0;
  const kcalMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:kcal|calories)/i);
  if (kcalMatch && kcalMatch[1]) {
    calories = parseFloat(kcalMatch[1].replace(',', '.'));
  } else {
    const calMatch = text.match(/(?:calories|calorie)[\s:=]+([0-9]+(?:[.,][0-9]+)?)/i);
    if (calMatch && calMatch[1]) {
      calories = parseFloat(calMatch[1].replace(',', '.'));
    } else {
      const kjMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*kj/i);
      if (kjMatch && kjMatch[1]) {
        calories = Math.round(parseFloat(kjMatch[1].replace(',', '.')) / 4.184);
      }
    }
  }

  // Protein
  const protein = findValue([
    /(?:protein|proteins|protéines|eiweiß)[\s:=]+([0-9]+(?:[.,][0-9]+)?)\s*g?/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*g\s*(?:protein|proteins|protéines|eiweiß)/i,
  ]);

  // Total Carbohydrates
  const carbs = findValue([
    /(?:total\s+carbohydrate|carbohydrates|carbohydrate|glucides|kohlenhydrate|carbs)[\s:=]+([0-9]+(?:[.,][0-9]+)?)\s*g?/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*g\s*(?:carbs|carbohydrate|glucides)/i,
  ]);

  // Total Fat
  const fat = findValue([
    /(?:total\s+fat|matières\s+grasses|lipides|fett|fat)[\s:=]+([0-9]+(?:[.,][0-9]+)?)\s*g?/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*g\s*(?:total\s+fat|fat|matières\s+grasses|lipides)/i,
  ]);

  // Saturated Fat
  const saturatedFat = findValue([
    /(?:saturated\s+fat|saturated|dont\s+acides\s+gras\s+saturés|acides\s+gras\s+saturés|gesättigte\s+fettsäuren)[\s:=]+([0-9]+(?:[.,][0-9]+)?)\s*g?/i,
  ]);

  // Dietary Fiber
  const fiber = findValue([
    /(?:dietary\s+fiber|fiber|fibre|ballaststoffe)[\s:=]+([0-9]+(?:[.,][0-9]+)?)\s*g?/i,
  ]);

  // Total Sugars
  const sugars = findValue([
    /(?:total\s+sugars|sugars|sugar|sucres|dont\s+sucres|zucker)[\s:=]+([0-9]+(?:[.,][0-9]+)?)\s*g?/i,
  ]);

  // Sodium / Salt
  let sodium = findValue([
    /(?:sodium|natrium)[\s:=]+([0-9]+(?:[.,][0-9]+)?)\s*mg?/i,
  ]);
  const salt = findValue([
    /(?:salt|sel|salz)[\s:=]+([0-9]+(?:[.,][0-9]+)?)\s*g/i,
  ]);
  if (sodium === 0 && salt > 0) {
    // 1g salt ≈ 400mg sodium
    sodium = Math.round(salt * 400);
  }

  // Serving size (handles "Serving size 1 bar (45g)" or "Portion: 30g")
  const servingSize = findValue([
    /(?:serving\s+size|per\s+serving|portion|serving)[^\d\n\r]*\(?([0-9]+(?:[.,][0-9]+)?)\s*(?:g|ml)\)?/i,
    /\(([0-9]+(?:[.,][0-9]+)?)\s*(?:g|ml)\)/i,
    /([0-9]+(?:[.,][0-9]+)?)\s*(?:g|ml)\s*per\s*serving/i,
  ]) || 100;

  // Product name extraction if present
  let productName = 'Scanned Nutrition Label';
  const firstLine = rawText.split('\n')[0]?.trim();
  if (firstLine && firstLine.length > 3 && !firstLine.toLowerCase().includes('nutrition')) {
    productName = firstLine.slice(0, 40);
  }

  // Detect if table is per 100g
  const isPer100g = text.includes('100g') || text.includes('100 g') || text.includes('per 100') || text.includes('/100');

  // Check if we extracted meaningful macronutrients
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
    return {
      success: false,
      source: 'failed',
      errorMessage: "Could not identify nutrition table numbers from text. Try capturing the label closer.",
    };
  }

  const data: ExtractedNutritionData = {
    productName,
    brand: 'Open Food Facts NutriSight',
    servingSizeGrams: servingSize,
    servingUnitName: `${servingSize}g`,
    isPer100g,
    calories,
    proteinGrams: protein,
    carbsGrams: carbs,
    fatGrams: fat,
    saturatedFatGrams: saturatedFat,
    fiberGrams: fiber,
    sugarsGrams: sugars,
    sodiumMg: sodium,
  };

  const foodItem = buildFoodItemFromLabel(data);

  return {
    success: true,
    data,
    asFoodItem: foodItem,
    rawText,
    source: 'label_parser',
  };
}

/**
 * Analyzes a nutrition facts label photo using Open Food Facts NutriSight LayoutLMv3
 * extraction rules via the active vision model pipeline.
 */
export async function extractNutritionFromLabelPhoto(
  photoUri: string,
  base64Data?: string | null,
  openAIConfig?: OpenAICompatibleConfig
): Promise<LabelExtractionResult> {
  // If OpenAI-compatible endpoint with vision capability is available
  if (base64Data && openAIConfig && openAIConfig.baseUrl && openAIConfig.apiKey) {
    try {
      let base = openAIConfig.baseUrl.trim().replace(/\/+$/, '');
      const url =
        base.endsWith('/v1') || base.includes('/v1/')
          ? `${base}/chat/completions`
          : `${base}/v1/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAIConfig.apiKey.trim()}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: openAIConfig.modelName || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are Open Food Facts NutriSight (LayoutLMv3 nutrition-extractor). Analyze the photo of the product nutrition facts table. Read the printed numbers accurately and return a single valid JSON object with NO markdown formatting, NO backticks. Keys required: "productName" (string), "servingSizeGrams" (number), "isPer100g" (boolean: true if numbers correspond to per 100g, false if per serving), "calories" (number), "proteinGrams" (number), "carbsGrams" (number), "fatGrams" (number), "saturatedFatGrams" (number or null), "fiberGrams" (number or null), "sodiumMg" (number or null). If values are provided both "per 100g" and "per serving", prioritize the "per serving" values with isPer100g=false. If no nutrition table is readable, return {"error": "NO_TABLE_FOUND"}.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract the nutrition facts table from this food packaging image:',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64Data}` },
                },
              ],
            },
          ],
          max_tokens: 250,
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const resData = await response.json();
        let content = resData.choices?.[0]?.message?.content?.trim();
        if (content) {
          // Remove potential markdown code blocks
          content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

          try {
            const parsed = JSON.parse(content);
            if (!parsed.error && (parsed.calories > 0 || parsed.proteinGrams > 0 || parsed.carbsGrams > 0)) {
              const data: ExtractedNutritionData = {
                productName: parsed.productName || 'Scanned Nutrition Label',
                brand: parsed.brand || 'Open Food Facts NutriSight',
                servingSizeGrams: parsed.servingSizeGrams || 100,
                servingUnitName: parsed.servingSizeGrams ? `${parsed.servingSizeGrams}g` : '100g',
                isPer100g: !!parsed.isPer100g,
                calories: parsed.calories || 0,
                proteinGrams: parsed.proteinGrams || 0,
                carbsGrams: parsed.carbsGrams || 0,
                fatGrams: parsed.fatGrams || 0,
                saturatedFatGrams: parsed.saturatedFatGrams || 0,
                fiberGrams: parsed.fiberGrams || 0,
                sodiumMg: parsed.sodiumMg || 0,
              };

              const asFoodItem = buildFoodItemFromLabel(data, photoUri);
              return {
                success: true,
                data,
                asFoodItem,
                source: 'openfoodfacts_nutrisight',
              };
            }
          } catch (jsonErr) {
            console.warn('[NutritionLabelExtractor] JSON parse error, falling back to text parser:', jsonErr);
            const textParsed = parseNutritionLabelText(content);
            if (textParsed.success && textParsed.asFoodItem) {
              textParsed.asFoodItem.imageUrl = photoUri;
              return textParsed;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[NutritionLabelExtractor] Vision extraction call error:', err);
    }
  }

  // Artificial short delay for responsive feedback
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    success: false,
    source: 'failed',
    errorMessage:
      "Could not detect a clear nutrition facts table. Ensure the label is well-lit and in focus, or enter values in search.",
  };
}
