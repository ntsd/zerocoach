const fs = require('fs');
const path = require('path');

const SOURCE_ZIP_URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip';
const TEMP_JSON_PATH = '/tmp/usda_sr_legacy/FoodData_Central_sr_legacy_food_json_2018-04.json';
const OUTPUT_PATH = path.join(__dirname, '../src/data/usdaWholeFoods.json');

function mapCategory(desc) {
  if (!desc) return 'packaged_goods';
  const d = desc.toLowerCase();
  if (d.includes('poultry') || d.includes('beef') || d.includes('pork') || d.includes('lamb') || d.includes('sausage') || d.includes('veal') || d.includes('game')) return 'meat_poultry';
  if (d.includes('finfish') || d.includes('shellfish')) return 'fish_seafood';
  if (d.includes('dairy') || d.includes('egg')) return 'eggs_dairy';
  if (d.includes('cereal') || d.includes('pasta') || d.includes('baked') || d.includes('grain')) return 'grains_bread';
  if (d.includes('fruit')) return 'fruits';
  if (d.includes('vegetable')) return 'vegetables';
  if (d.includes('legume') || d.includes('nut') || d.includes('seed')) return 'legumes_nuts';
  if (d.includes('beverage')) return 'beverages';
  if (d.includes('meal') || d.includes('fast food') || d.includes('restaurant') || d.includes('soup') || d.includes('entree')) return 'prepared_meal';
  return 'packaged_goods';
}

function extractNutrient(food, number) {
  const item = food.foodNutrients.find((n) => n.nutrient && n.nutrient.number === number);
  return item && typeof item.amount === 'number' ? Math.max(0, item.amount) : 0;
}

function main() {
  console.log('Reading USDA SR Legacy JSON from:', TEMP_JSON_PATH);
  if (!fs.existsSync(TEMP_JSON_PATH)) {
    console.error('SR Legacy JSON not found at ' + TEMP_JSON_PATH);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(TEMP_JSON_PATH, 'utf8'));
  const srLegacyList = rawData.SRLegacyFoods || [];
  console.log(`Loaded ${srLegacyList.length} items from SR Legacy.`);

  // Load existing curated items first to maintain clean rankings and serving descriptions
  const existingItems = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  console.log(`Retaining ${existingItems.length} curated staple foods at the top.`);

  const existingIds = new Set(existingItems.map((item) => item.id));
  const existingNames = new Set(existingItems.map((item) => item.name.toLowerCase()));

  const newItems = [];

  for (const f of srLegacyList) {
    const fdcId = f.fdcId;
    const foodId = `usda-sr-${fdcId}`;
    if (existingIds.has(foodId)) continue;

    const desc = f.description ? f.description.trim() : '';
    if (!desc || existingNames.has(desc.toLowerCase())) continue;

    const pProt = extractNutrient(f, '203');
    const pFat = extractNutrient(f, '204');
    const pCarb = extractNutrient(f, '205');
    let pCals = extractNutrient(f, '208');
    if (!pCals && (pProt || pFat || pCarb)) {
      pCals = Math.round(pProt * 4 + pCarb * 4 + pFat * 9);
    }

    // Skip items with zero nutritional content (e.g. empty test entries)
    if (pCals === 0 && pProt === 0 && pFat === 0 && pCarb === 0) continue;

    // Determine primary portion description
    let servingGrams = 100;
    let servingUnit = '100g';
    if (f.foodPortions && f.foodPortions.length > 0) {
      const validPortions = f.foodPortions.filter((p) => p.gramWeight > 0);
      if (validPortions.length > 0) {
        const best =
          validPortions.find((p) => p.modifier && !p.modifier.toLowerCase().includes('oz')) ||
          validPortions[0];
        const amount = best.amount || 1;
        const mod = best.modifier ? best.modifier.trim() : 'serving';
        servingGrams = Math.round(best.gramWeight);
        servingUnit = `100g (or ${amount} ${mod} ~${servingGrams}g)`;
      }
    }

    // Vitamin A (RAE preferred, or IU fallback)
    let vitA = extractNutrient(f, '320');
    if (!vitA) {
      const iu = extractNutrient(f, '318');
      if (iu) vitA = Math.round(iu * 0.3);
    }

    // Vitamin D (mcg preferred, or IU fallback)
    let vitD = extractNutrient(f, '328');
    if (!vitD) {
      const iu = extractNutrient(f, '324');
      if (iu) vitD = Math.round(iu * 0.025 * 10) / 10;
    }

    const nutrientsPer100g = {
      calories: Math.round(pCals),
      proteinGrams: Math.round(pProt * 10) / 10,
      carbsGrams: Math.round(pCarb * 10) / 10,
      fatGrams: Math.round(pFat * 10) / 10,
      fiberGrams: Math.round(extractNutrient(f, '291') * 10) / 10,
      vitaminA_mcg: Math.round(vitA),
      vitaminC_mg: Math.round(extractNutrient(f, '401') * 10) / 10,
      vitaminD_mcg: Math.round(vitD * 10) / 10,
      vitaminB12_mcg: Math.round(extractNutrient(f, '418') * 100) / 100,
      vitaminE_mg: Math.round(extractNutrient(f, '323') * 10) / 10,
      iron_mg: Math.round(extractNutrient(f, '303') * 10) / 10,
      calcium_mg: Math.round(extractNutrient(f, '301')),
      magnesium_mg: Math.round(extractNutrient(f, '304')),
      potassium_mg: Math.round(extractNutrient(f, '306')),
      sodium_mg: Math.round(extractNutrient(f, '307')),
      zinc_mg: Math.round(extractNutrient(f, '309') * 10) / 10,
    };

    newItems.push({
      id: foodId,
      name: desc,
      category: mapCategory(f.foodCategory ? f.foodCategory.description : ''),
      servingSizeGrams: 100,
      servingUnitName: servingUnit,
      source: 'usda_bundled',
      hasCompleteMicros: true,
      nutrientsPer100g,
    });
  }

  const combined = [...existingItems, ...newItems];
  console.log(`Writing ${combined.length} total foods to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(combined, null, 2), 'utf8');
  console.log('Successfully updated usdaWholeFoods.json!');
}

main();
