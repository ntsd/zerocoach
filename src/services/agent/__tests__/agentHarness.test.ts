import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractSyntheticToolCall,
  parseToolCallFromText,
  cleanFinalResponseText,
  isTargetUpdateAccidentalOnMealInquiry,
  buildScopedAgentToolPrompt,
} from '../agentHarness';
import { inferMealTypeFromCurrentTime } from '../dispatcher';
import {
  isNegationOrRecoveryStatement,
  deleteMemoryByQuery,
} from '../../memory/memoryEngine';
import { MemoryItem } from '@/types/memory';

describe('AgentHarness Synthetic Fallbacks & Memory Interception', () => {
  it('extracts synthetic save_memory call when model outputs plain-text checkmark confirmation', () => {
    const output = '✅ **Saved to Coach Memory:** I like steak';
    const call = extractSyntheticToolCall(output, 'I like steak');
    assert.ok(call, 'Should synthesize a tool call');
    assert.strictEqual(call.name, 'save_memory');
    assert.strictEqual(call.arguments.content, 'I like steak');
    assert.strictEqual(call.arguments.category, 'food_preference');
  });

  it('extracts synthetic save_memory without checkmark or bold tags', () => {
    const output = 'Saved to Coach Memory: Available equipment: Pull-up bar';
    const call = extractSyntheticToolCall(output, 'I bought a pull-up bar');
    assert.ok(call, 'Should synthesize a tool call');
    assert.strictEqual(call.name, 'save_memory');
    assert.strictEqual(call.arguments.content, 'Available equipment: Pull-up bar');
    assert.strictEqual(call.arguments.category, 'workout_preference');
  });

  it('intercepts fake save confirmation and converts to remove_memory when user requested removal', () => {
    const lastUserMsg = "Remove that I don't like shrimp, I actually like shrimp";
    const fakeOutput = "✅ **Saved to Coach Memory:** I don't like shrimp";

    const call = extractSyntheticToolCall(fakeOutput, lastUserMsg);
    assert.ok(call, 'Should intercept fake confirmation');
    assert.strictEqual(call.name, 'remove_memory', 'Should redirect to remove_memory');
    assert.strictEqual(call.arguments.idOrQuery, "I don't like shrimp");
  });

  it('extracts synthetic remove_memory call when model outputs plain-text removal confirmation', () => {
    const output = '✅ **Removed from Coach Memory:** shrimp';
    const call = extractSyntheticToolCall(output, 'Remove shrimp allergy');
    assert.ok(call, 'Should synthesize a remove tool call');
    assert.strictEqual(call.name, 'remove_memory');
    assert.strictEqual(call.arguments.idOrQuery, 'shrimp');
  });

  it('returns null for normal conversational responses without fake confirmation patterns', () => {
    const output = 'Great job hitting your macros today! How is your soreness level?';
    const call = extractSyntheticToolCall(output, 'I had a good day');
    assert.strictEqual(call, null);
  });

  it('handles Thai synthetic confirmations', () => {
    const output = '✅ บันทึกความจำเรียบร้อย: ชอบกินข้าวกล้อง';
    const call = extractSyntheticToolCall(output, 'ผมชอบกินข้าวกล้อง');
    assert.ok(call, 'Should synthesize tool call for Thai confirmation');
    assert.strictEqual(call.name, 'save_memory');
    assert.strictEqual(call.arguments.content, 'ชอบกินข้าวกล้อง');
  });

  it('extracts synthetic log_food_item call when model outputs plain-text food logging confirmation', () => {
    const output = '✅ **Logged "Cornbread" (450g, 1197 kcal, 30.2g protein, 195.8g carbs, 32g fat) to lunch**\n\nThis fits your macros.';
    const call = extractSyntheticToolCall(output, 'I just ate this.');
    assert.ok(call, 'Should synthesize a log_food_item tool call');
    assert.strictEqual(call.name, 'log_food_item');
    assert.strictEqual(call.arguments.name, 'Cornbread');
    assert.strictEqual(call.arguments.consumedGrams, 450);
    assert.strictEqual(call.arguments.calories, 1197);
    assert.strictEqual(call.arguments.proteinGrams, 30.2);
    assert.strictEqual(call.arguments.carbsGrams, 195.8);
    assert.strictEqual(call.arguments.fatGrams, 32);
    assert.strictEqual(call.arguments.mealType, 'lunch');
  });

  it('auto-infers mealType from device clock when omitted in food log output', () => {
    const output = '✅ **Logged "Oatmeal" (100g, 150 kcal, 5g protein)**';
    const call = extractSyntheticToolCall(output, 'I ate oatmeal');
    assert.ok(call, 'Should synthesize a log_food_item tool call');
    assert.strictEqual(call.name, 'log_food_item');
    assert.strictEqual(call.arguments.name, 'Oatmeal');
    assert.strictEqual(call.arguments.mealType, inferMealTypeFromCurrentTime());
  });

  it('detects accidental update_daily_macro_targets on food suggestion queries', () => {
    assert.strictEqual(
      isTargetUpdateAccidentalOnMealInquiry(
        'update_daily_macro_targets',
        'Based on my current daily targets (1283 kcal and 44.2g protein remaining), what meal or whole foods should I eat next?'
      ),
      true
    );
    assert.strictEqual(
      isTargetUpdateAccidentalOnMealInquiry(
        'update_daily_macro_targets',
        'I have 557 kcal left today. What should I eat?'
      ),
      true
    );
    assert.strictEqual(
      isTargetUpdateAccidentalOnMealInquiry(
        'update_daily_macro_targets',
        'Please update my daily calorie target to 2200 kcal'
      ),
      false
    );
    assert.strictEqual(
      isTargetUpdateAccidentalOnMealInquiry(
        'log_food_item',
        'What meal or whole foods should I eat next?'
      ),
      false
    );
    assert.strictEqual(
      isTargetUpdateAccidentalOnMealInquiry(
        'update_user_settings',
        'What meal or whole foods should I eat next?',
        { dailyCalorieTarget: 1800 }
      ),
      true
    );
    assert.strictEqual(
      isTargetUpdateAccidentalOnMealInquiry(
        'update_user_settings',
        'Set my body weight to 70kg',
        { weightKg: 70 }
      ),
      false
    );
  });

  it('buildScopedAgentToolPrompt simplifies save_memory and excludes eliminated read tools', () => {
    const fullPrompt = buildScopedAgentToolPrompt();

    // Verified Task 2: save_memory takes only content
    assert.ok(
      fullPrompt.includes('save_memory(content)'),
      'save_memory should be simplified to content'
    );
    assert.ok(
      !fullPrompt.includes('save_memory(category, content, topic)'),
      'save_memory should not require category or topic'
    );

    // Verified Task 3: Eliminated read tools
    assert.ok(
      !fullPrompt.includes('get_telemetry_metrics'),
      'get_telemetry_metrics should be eliminated from agent tool prompt'
    );
    assert.ok(
      !fullPrompt.includes('get_food_history'),
      'get_food_history should be eliminated from agent tool prompt'
    );

    // Verified Task 4: Consolidated tools
    assert.ok(
      !fullPrompt.includes('get_exercise_details'),
      'get_exercise_details should be consolidated into search_exercises'
    );
    assert.ok(
      !fullPrompt.includes('update_daily_macro_targets'),
      'update_daily_macro_targets should be consolidated into update_user_settings'
    );
    assert.ok(
      fullPrompt.includes('search_exercises(query, muscleGroup)'),
      'search_exercises should be available'
    );
    assert.ok(
      fullPrompt.includes('update_user_settings(dailyCalorieTarget, proteinGrams'),
      'update_user_settings should include nutrition targets'
    );
  });
});

describe('Memory Negation & Deletion Engine', () => {
  it('correctly classifies removal and reversal statements as negations', () => {
    assert.strictEqual(
      isNegationOrRecoveryStatement("Remove that I don't like shrimp, I actually like shrimp"),
      true
    );
    assert.strictEqual(
      isNegationOrRecoveryStatement("Forget that I don't eat pork"),
      true
    );
    assert.strictEqual(
      isNegationOrRecoveryStatement("I actually like salmon now"),
      true
    );
    assert.strictEqual(
      isNegationOrRecoveryStatement("Delete that memory about pull-up bar"),
      true
    );
    assert.strictEqual(
      isNegationOrRecoveryStatement("I don't like shrimp"),
      false,
      'Stating a dislike is a preference to save, not a negation to delete'
    );
  });

  it('deletes memory matching entity when query contains complex reversal phrasing', () => {
    const existingMemories: MemoryItem[] = [
      {
        id: 'mem-shrimp',
        category: 'food_preference',
        topic: 'shrimp_allergy',
        content: "I don't eat shrimp",
        source: 'agent',
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'mem-steak',
        category: 'food_preference',
        topic: 'favorite_food',
        content: 'Favorite food: steak',
        source: 'agent',
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];

    const { memories, result } = deleteMemoryByQuery(
      existingMemories,
      "Remove that I don't like shrimp, I actually like shrimp"
    );

    assert.strictEqual(result.operation, 'DELETE');
    assert.strictEqual(result.removedId, 'mem-shrimp');
    assert.strictEqual(memories.length, 1);
    assert.strictEqual(memories[0].id, 'mem-steak');
  });
});

