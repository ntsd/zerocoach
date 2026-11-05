import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  tryParseOrRepairJson,
  parseVisionMealResponse,
  decomposeMealWithGemma,
} from '../mealDecomposer';

describe('Meal Decomposer Truncated Vision JSON Repair', () => {
  it('repairs truncated vision JSON and recovers completed ingredients', () => {
    const truncatedOutput = `\`\`\`json
{
  "dishTitle": "Roasted Pork Ribs with Pickled Vegetables",
  "ingredients": [
    {
      "name": "Pork ribs",
      "quantityGrams": 200,
      "calories": 480,
      "proteinGrams": 40,
      "carbsGrams": 0,
      "fatGrams": 35
    },
    {
      "name": "Pickled red cabbage",
      "quantityGrams": 30,
      "calories": 15,
      "proteinGrams": 0.5,
      "carbsGrams": 3,
      "fatGrams": 0.1
    },
    {
      "name": "Pickled green pepper",
      "quantityGrams": 15,
      "calories": 10,
      "proteinGrams": 0.3,
      "carbsGrams": 2,
      "fatGrams": 0.1
    },
    {
      "name": "Pickled jalapeño",
      "quantityGrams": 15,
      "calories": 8,
      "proteinGrams": 0.2,
      "carbsGrams": 1.5,
      "fatGrams": 0.1,
`;

    const repaired = tryParseOrRepairJson(truncatedOutput);
    assert.ok(repaired, 'Should repair truncated JSON');
    assert.strictEqual(repaired.dishTitle, 'Roasted Pork Ribs with Pickled Vegetables');
    assert.strictEqual(repaired.ingredients.length, 3, 'Should recover the 3 fully completed ingredients');
    assert.strictEqual(repaired.ingredients[0].name, 'Pork ribs');
    assert.strictEqual(repaired.ingredients[0].quantityGrams, 200);

    const decomp = parseVisionMealResponse(truncatedOutput);
    assert.ok(decomp, 'Should produce a valid MealDecompositionResult');
    assert.strictEqual(decomp.dishTitle, 'Roasted Pork Ribs with Pickled Vegetables');
    assert.ok(decomp.totalGrams < 400, `Total grams should be reasonable (~245g), got ${decomp.totalGrams}g`);
  });

  it('never treats raw JSON lines as separate 100g ingredients', async () => {
    const brokenJson = `\`\`\`json
{
  "dishTitle": "BBQ Pork Ribs",
  "ingredients": [
    {
      "name": "Pork ribs"
`;

    const decomp = await decomposeMealWithGemma(brokenJson);
    assert.ok(decomp, 'Should produce a decomposition');
    // Ensure total grams is reasonable for BBQ Pork Ribs and not thousands of grams
    assert.ok(
      decomp.totalGrams < 1000,
      `Should not balloon to thousands of grams, got ${decomp.totalGrams}g`
    );
  });
});

