import { FoodItem, NutrientProfile, FoodCategory } from '../../types/nutrition';
import usdaWholeFoodsRaw from '../../data/usdaWholeFoods.json';

// Cast USDA bundled items as FoodItem[]
export const usdaWholeFoods: FoodItem[] = (usdaWholeFoodsRaw as unknown as FoodItem[]).map((f) => ({
  ...f,
  source: 'usda_bundled' as const,
  hasCompleteMicros: true,
}));

// Fallback search in USDA database
export function searchUsdaFoods(query: string): FoodItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return usdaWholeFoods.slice(0, 15);
  }
  const words = trimmed.split(/\s+/);
  return usdaWholeFoods.filter((food) => {
    const nameMatch = words.every((w) => food.name.toLowerCase().includes(w));
    const catMatch = food.category.toLowerCase().includes(trimmed);
    return nameMatch || catMatch;
  });
}

export function getUsdaFoodById(id: string): FoodItem | undefined {
  return usdaWholeFoods.find((f) => f.id === id);
}

// Convert Open Food Facts nutriments to NutrientProfile
function parseOffNutriments(nutriments: Record<string, any> = {}): NutrientProfile {
  // Energy in kcal
  let calories = Number(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0);
  if (!calories && nutriments['energy_100g']) {
    // If only kJ is available, divide by 4.184
    calories = Math.round(Number(nutriments['energy_100g']) / 4.184);
  }

  const proteinGrams = Number(nutriments['proteins_100g'] ?? nutriments['proteins'] ?? 0);
  const carbsGrams = Number(nutriments['carbohydrates_100g'] ?? nutriments['carbohydrates'] ?? 0);
  const fatGrams = Number(nutriments['fat_100g'] ?? nutriments['fat'] ?? 0);
  const fiberGrams = Number(nutriments['fiber_100g'] ?? nutriments['fiber'] ?? 0);

  // Vitamins
  // Vitamin A (mcg)
  let vitaminA_mcg = Number(nutriments['vitamin-a_100g'] ?? 0);
  if (nutriments['vitamin-a_unit'] === 'mg') {
    vitaminA_mcg *= 1000;
  }

  // Vitamin C (mg)
  let vitaminC_mg = Number(nutriments['vitamin-c_100g'] ?? 0);
  if (nutriments['vitamin-c_unit'] === 'g') {
    vitaminC_mg *= 1000;
  }

  // Vitamin D (mcg)
  let vitaminD_mcg = Number(nutriments['vitamin-d_100g'] ?? 0);
  if (nutriments['vitamin-d_unit'] === 'mg') {
    vitaminD_mcg *= 1000;
  }

  // Vitamin B12 (mcg)
  let vitaminB12_mcg = Number(nutriments['vitamin-b12_100g'] ?? 0);
  if (nutriments['vitamin-b12_unit'] === 'mg') {
    vitaminB12_mcg *= 1000;
  }

  // Vitamin E (mg)
  let vitaminE_mg = Number(nutriments['vitamin-e_100g'] ?? 0);

  // Minerals (mg)
  const iron_mg = Number(nutriments['iron_100g'] ?? 0);
  const calcium_mg = Number(nutriments['calcium_100g'] ?? 0);
  const magnesium_mg = Number(nutriments['magnesium_100g'] ?? 0);
  const potassium_mg = Number(nutriments['potassium_100g'] ?? 0);
  const zinc_mg = Number(nutriments['zinc_100g'] ?? 0);

  // Sodium (mg)
  let sodium_mg = Number(nutriments['sodium_100g'] ?? 0);
  if (nutriments['sodium_unit'] === 'g') {
    sodium_mg *= 1000;
  } else if (!sodium_mg && nutriments['salt_100g']) {
    // Salt is ~40% sodium
    sodium_mg = Math.round(Number(nutriments['salt_100g']) * 400);
  }

  return {
    calories: Math.max(0, Math.round(calories)),
    proteinGrams: Math.max(0, Math.round(proteinGrams * 10) / 10),
    carbsGrams: Math.max(0, Math.round(carbsGrams * 10) / 10),
    fatGrams: Math.max(0, Math.round(fatGrams * 10) / 10),
    fiberGrams: Math.max(0, Math.round(fiberGrams * 10) / 10),
    vitaminA_mcg: Math.max(0, Math.round(vitaminA_mcg)),
    vitaminC_mg: Math.max(0, Math.round(vitaminC_mg * 10) / 10),
    vitaminD_mcg: Math.max(0, Math.round(vitaminD_mcg * 10) / 10),
    vitaminB12_mcg: Math.max(0, Math.round(vitaminB12_mcg * 100) / 100),
    vitaminE_mg: Math.max(0, Math.round(vitaminE_mg * 10) / 10),
    iron_mg: Math.max(0, Math.round(iron_mg * 10) / 10),
    calcium_mg: Math.max(0, Math.round(calcium_mg)),
    magnesium_mg: Math.max(0, Math.round(magnesium_mg)),
    potassium_mg: Math.max(0, Math.round(potassium_mg)),
    sodium_mg: Math.max(0, Math.round(sodium_mg)),
    zinc_mg: Math.max(0, Math.round(zinc_mg * 10) / 10),
  };
}

/**
 * Parse Open Food Facts quantity or serving size string / numeric fields to grams/ml.
 */
export function parseOffQuantityString(
  qtyStr?: string | null,
  numericQty?: number | null,
  unitStr?: string | null
): { grams: number; displayUnit: string } | null {
  // 1. If numeric quantity is available from API
  if (typeof numericQty === 'number' && numericQty > 0) {
    const u = (unitStr || '').toLowerCase().trim();
    let grams = numericQty;
    if (u === 'kg' || u === 'l') grams = numericQty * 1000;
    else if (u === 'cl') grams = numericQty * 10;
    else if (u === 'dl') grams = numericQty * 100;
    else if (u === 'oz') grams = numericQty * 28.3495;
    else if (u === 'fl oz' || u === 'floz') grams = numericQty * 29.5735;

    const display = qtyStr?.trim() || `${Math.round(grams)}${u === 'ml' || u === 'l' ? 'ml' : 'g'}`;
    return { grams: Math.max(1, Math.round(grams)), displayUnit: display };
  }

  if (!qtyStr || typeof qtyStr !== 'string') return null;
  const cleanStr = qtyStr.trim();
  if (!cleanStr) return null;

  // 2. Check for expressions with equals, e.g. '3 x 200g = 600g'
  const eqMatch = cleanStr.match(/=\s*([0-9.,]+)\s*(kg|g|l|ml|cl|dl|oz|fl\s*oz)\b/i);
  if (eqMatch) {
    const val = parseFloat(eqMatch[1].replace(',', '.'));
    const u = eqMatch[2].toLowerCase().replace(/\s+/g, '');
    let grams = val;
    if (u === 'kg' || u === 'l') grams *= 1000;
    else if (u === 'cl') grams *= 10;
    else if (u === 'dl') grams *= 100;
    else if (u === 'oz') grams *= 28.3495;
    else if (u === 'floz') grams *= 29.5735;
    return { grams: Math.max(1, Math.round(grams)), displayUnit: cleanStr };
  }

  // 3. Multi-pack expressions like '4 x 100 g', '2x125g', '6 x 33cl'
  const multiMatch = cleanStr.match(/(\d+)\s*[xX*]\s*([0-9.,]+)\s*(kg|g|l|ml|cl|dl|oz|fl\s*oz)\b/i);
  if (multiMatch) {
    const count = parseInt(multiMatch[1], 10);
    const each = parseFloat(multiMatch[2].replace(',', '.'));
    const u = multiMatch[3].toLowerCase().replace(/\s+/g, '');
    let total = count * each;
    if (u === 'kg' || u === 'l') total *= 1000;
    else if (u === 'cl') total *= 10;
    else if (u === 'dl') total *= 100;
    else if (u === 'oz') total *= 28.3495;
    else if (u === 'floz') total *= 29.5735;
    return { grams: Math.max(1, Math.round(total)), displayUnit: cleanStr };
  }

  // 4. Standard expression: number followed by unit (e.g. '330 ml', '500g', '400 g e', '1.5 L')
  const stdMatch = cleanStr.match(/([0-9.,]+)\s*(kg|g|l|ml|cl|dl|oz|fl\s*oz)\b/i);
  if (stdMatch) {
    const val = parseFloat(stdMatch[1].replace(',', '.'));
    const u = stdMatch[2].toLowerCase().replace(/\s+/g, '');
    let grams = val;
    if (u === 'kg' || u === 'l') grams *= 1000;
    else if (u === 'cl') grams *= 10;
    else if (u === 'dl') grams *= 100;
    else if (u === 'oz') grams *= 28.3495;
    else if (u === 'floz') grams *= 29.5735;
    return { grams: Math.max(1, Math.round(grams)), displayUnit: cleanStr };
  }

  // 5. Bare number
  const numOnlyMatch = cleanStr.match(/^[0-9.,]+$/);
  if (numOnlyMatch) {
    const val = parseFloat(numOnlyMatch[0].replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      return { grams: Math.round(val), displayUnit: `${Math.round(val)}g` };
    }
  }

  return null;
}

// Convert OFF product object to FoodItem
function mapOffProductToFoodItem(product: any): FoodItem | null {
  if (!product || (!product.product_name && !product.product_name_en)) {
    return null;
  }
  const name = product.product_name || product.product_name_en || 'Unknown Product';
  const brand = Array.isArray(product.brands)
    ? product.brands.join(', ')
    : typeof product.brands === 'string' && product.brands.trim()
    ? product.brands
    : product.brands_tags?.[0];
  const nutrients = parseOffNutriments(product.nutriments);

  // If calorie is 0 and protein/carb/fat are all 0, it's likely bad/empty data
  if (
    nutrients.calories === 0 &&
    nutrients.proteinGrams === 0 &&
    nutrients.carbsGrams === 0 &&
    nutrients.fatGrams === 0
  ) {
    return null;
  }

  // Determine category
  let category: FoodCategory = 'packaged_goods';
  const categoriesLower = (
    Array.isArray(product.categories)
      ? product.categories.join(' ')
      : product.categories || ''
  ).toLowerCase();

  if (categoriesLower.includes('beverage') || categoriesLower.includes('drink')) {
    category = 'beverages';
  } else if (categoriesLower.includes('meat') || categoriesLower.includes('poultry')) {
    category = 'meat_poultry';
  } else if (categoriesLower.includes('fish') || categoriesLower.includes('seafood')) {
    category = 'fish_seafood';
  } else if (categoriesLower.includes('dairy') || categoriesLower.includes('egg') || categoriesLower.includes('cheese')) {
    category = 'eggs_dairy';
  } else if (categoriesLower.includes('bread') || categoriesLower.includes('cereal') || categoriesLower.includes('grain')) {
    category = 'grains_bread';
  } else if (categoriesLower.includes('fruit')) {
    category = 'fruits';
  } else if (categoriesLower.includes('vegetable')) {
    category = 'vegetables';
  }

  const hasMicros =
    nutrients.calcium_mg > 0 ||
    nutrients.iron_mg > 0 ||
    nutrients.potassium_mg > 0 ||
    nutrients.vitaminC_mg > 0 ||
    nutrients.vitaminA_mcg > 0;

  // Parse package quantity and serving quantity directly from Open Food Facts
  const parsedPackageQty = parseOffQuantityString(
    product.quantity,
    product.product_quantity,
    product.product_quantity_unit
  );

  const parsedServingQty = parseOffQuantityString(
    product.serving_size,
    product.serving_quantity,
    product.serving_quantity_unit
  );

  const packageGrams = parsedPackageQty?.grams;
  const servingGrams = parsedServingQty?.grams;

  // The primary quantity following Open Food Facts (e.g. 330ml for Coke, 50g for Snickers)
  const offQuantityGrams = packageGrams || servingGrams || 100;
  const offDisplayUnit =
    parsedPackageQty?.displayUnit ||
    parsedServingQty?.displayUnit ||
    product.quantity ||
    product.serving_size ||
    '100g';

  return {
    id: `off_${product.code || product._id || Math.random().toString(36).substring(7)}`,
    name,
    brand,
    category,
    servingSizeGrams: offQuantityGrams,
    servingUnitName: offDisplayUnit,
    nutrientsPer100g: nutrients,
    source: 'open_food_facts',
    barcode: product.code,
    imageUrl: product.image_front_small_url || product.image_small_url || product.image_url,
    hasCompleteMicros: hasMicros,
    packageQuantityGrams: packageGrams,
    packageQuantityUnitName: parsedPackageQty?.displayUnit || (product.quantity ? String(product.quantity) : undefined),
    servingQuantityGrams: servingGrams,
    offQuantity: product.quantity ? String(product.quantity) : parsedPackageQty?.displayUnit,
  };
}

// Fetch single product by barcode
export async function fetchProductByBarcode(barcode: string): Promise<FoodItem | null> {
  const cleanCode = barcode.trim();
  if (!cleanCode) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json?fields=code,product_name,product_name_en,brands,brands_tags,nutriments,serving_size,serving_quantity,serving_quantity_unit,quantity,product_quantity,product_quantity_unit,categories,image_front_small_url`,
      {
        headers: {
          'User-Agent': 'ZeroCoach-App - Android - Version 1.0 (https://zerocoach.app)',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === 1 && data.product) {
      return mapOffProductToFoodItem(data.product);
    }
  } catch (err) {
    console.warn('[OpenFoodFacts] Barcode fetch error:', err);
  }
  return null;
}

// Query Open Food Facts search API (Elasticsearch Search-a-licious)
export async function searchOpenFoodFacts(query: string, page = 1, pageSize = 20): Promise<FoodItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(
      cleanQuery
    )}&page=${page}&page_size=${pageSize}&fields=code,product_name,product_name_en,brands,brands_tags,nutriments,serving_size,serving_quantity,serving_quantity_unit,quantity,product_quantity,product_quantity_unit,categories,image_front_small_url`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ZeroCoach-App - Android - Version 1.0 (https://zerocoach.app)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data = await response.json();
    const products: any[] = data.hits || data.products || [];

    const items: FoodItem[] = [];
    for (const prod of products) {
      const item = mapOffProductToFoodItem(prod);
      if (item) {
        items.push(item);
      }
    }
    return items;
  } catch (err) {
    console.warn('[OpenFoodFacts] Search error, falling back:', err);
    return [];
  }
}

export type FoodSourceFilter = 'all' | 'open_food_facts' | 'usda_bundled';

// Unified Search: Combines USDA whole foods (instant offline) + Open Food Facts
export async function searchAllFoods(
  query: string,
  filter: FoodSourceFilter = 'all'
): Promise<FoodItem[]> {
  const clean = query.trim();

  if (filter === 'usda_bundled') {
    return searchUsdaFoods(clean);
  }

  if (filter === 'open_food_facts') {
    if (!clean) return [];
    return searchOpenFoodFacts(clean, 1, 20);
  }

  // filter === 'all'
  const localMatches = searchUsdaFoods(clean);
  if (!clean) {
    return localMatches;
  }

  // Also query Open Food Facts in parallel
  try {
    const offResults = await searchOpenFoodFacts(clean, 1, 20);
    // Combine results: USDA whole foods first (since they have complete verified micros), then OFF branded goods
    return [...localMatches, ...offResults];
  } catch {
    return localMatches;
  }
}

