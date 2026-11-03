import assert from 'node:assert';
import {
  isNegationOrRecoveryStatement,
  deleteMemoryByQuery,
  reconcileMemory,
  computeMemorySimilarity,
  tokenizeMemoryText,
  inferCategoryFromContent,
} from '../src/services/memory/mem0Engine.ts';
import { MemoryItem } from '../src/types/memory.ts';

console.log('--- 1. Testing isNegationOrRecoveryStatement ---');
const positiveNegations = [
  "when I say I don't allergic to shrimp it should remove the memory",
  "I don't allergy to shrimp",
  "I don't allergic to shrimp",
  "I lie, I don't allergy to shrimp",
  "not allergic to shrimp",
  "I am not allergic to shrimp",
  "I have no shrimp allergy",
  "no allergy to shrimp",
  "healed from shoulder pain",
  "shoulder doesn't hurt anymore",
  "don't have a pull-up bar anymore",
  "forget that",
  "remove memory shrimp",
  "ไม่ได้แพ้กุ้งแล้ว",
  "ไม่แพ้กุ้ง",
  "หายเจ็บหัวเข่าแล้ว",
];

for (const phrase of positiveNegations) {
  const result = isNegationOrRecoveryStatement(phrase);
  assert.strictEqual(result, true, `Expected "${phrase}" to be recognized as negation`);
}
console.log(`✅ ${positiveNegations.length} negation phrases correctly detected.`);

const nonNegations = [
  "I am allergic to shrimp",
  "I have a peanut allergy",
  "My shoulder hurts when benching",
  "I have a pull-up bar",
  "I don't like tomatoes", // Food dislike, not allergy negation
  "I love calisthenics",
];

for (const phrase of nonNegations) {
  const result = isNegationOrRecoveryStatement(phrase);
  assert.strictEqual(result, false, `Expected "${phrase}" NOT to be recognized as negation`);
}
console.log(`✅ ${nonNegations.length} non-negation phrases correctly identified.`);

console.log('\n--- 2. Testing inferCategoryFromContent ---');
assert.strictEqual(inferCategoryFromContent("Allergic to shrimp"), "food_preference");
assert.strictEqual(inferCategoryFromContent("I don't allergic to shrimp"), "food_preference");
assert.strictEqual(inferCategoryFromContent("Available equipment: Pull-up bar"), "workout_preference");
assert.strictEqual(inferCategoryFromContent("Left shoulder impingement"), "injury_limitation");
console.log('✅ inferCategoryFromContent correctly identifies categories including seafood.');

console.log('\n--- 3. Testing deleteMemoryByQuery ---');
const initialMemories: MemoryItem[] = [
  {
    id: "mem-1",
    category: "food_preference",
    topic: "allergy_shrimp",
    content: "Allergic to shrimp",
    source: "agent",
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: "mem-2",
    category: "workout_preference",
    topic: "food_allergy",
    content: "Allergic to shrimp",
    source: "agent",
    createdAt: 2000,
    updatedAt: 2000,
  },
  {
    id: "mem-3",
    category: "workout_preference",
    topic: "equipment_pull_up_bar",
    content: "Available equipment: Pull-up bar",
    source: "agent",
    createdAt: 3000,
    updatedAt: 3000,
  },
];

// Test 3a: Delete by keyword "shrimp"
{
  const res = deleteMemoryByQuery(initialMemories, "shrimp");
  assert.strictEqual(res.result.operation, "DELETE");
  assert.strictEqual(res.memories.length, 1);
  assert.strictEqual(res.memories[0].id, "mem-3");
  console.log('✅ deleteMemoryByQuery("shrimp") deletes both shrimp memories.');
}

// Test 3b: Delete by user query "I don't allergic to shrimp"
{
  const res = deleteMemoryByQuery(initialMemories, "I don't allergic to shrimp");
  assert.strictEqual(res.result.operation, "DELETE");
  assert.strictEqual(res.memories.length, 1);
  assert.strictEqual(res.memories[0].id, "mem-3");
  console.log('✅ deleteMemoryByQuery("I don\'t allergic to shrimp") deletes matching memories.');
}

// Test 3c: Delete by "I lie, I don't allergy to shrimp"
{
  const res = deleteMemoryByQuery(initialMemories, "I lie, I don't allergy to shrimp");
  assert.strictEqual(res.result.operation, "DELETE");
  assert.strictEqual(res.memories.length, 1);
  assert.strictEqual(res.memories[0].id, "mem-3");
  console.log('✅ deleteMemoryByQuery("I lie, I don\'t allergy to shrimp") deletes matching memories.');
}

// Test 3d: Delete by "not allergic to shrimp"
{
  const res = deleteMemoryByQuery(initialMemories, "not allergic to shrimp");
  assert.strictEqual(res.result.operation, "DELETE");
  assert.strictEqual(res.memories.length, 1);
  assert.strictEqual(res.memories[0].id, "mem-3");
  console.log('✅ deleteMemoryByQuery("not allergic to shrimp") deletes matching memories.');
}

console.log('\n--- 4. Testing reconcileMemory ---');
// Test 4a: Candidate is negation statement
{
  const res = reconcileMemory(initialMemories, {
    category: "food_preference",
    content: "I don't allergic to shrimp",
    source: "agent",
  });
  assert.strictEqual(res.result.operation, "DELETE");
  assert.strictEqual(res.memories.length, 1);
  assert.strictEqual(res.memories[0].id, "mem-3");
  console.log('✅ reconcileMemory handles negation statement as DELETE.');
}

// Test 4b: Candidate with cross-category duplicate does not create duplicate
{
  const res = reconcileMemory(
    [
      {
        id: "mem-1",
        category: "food_preference",
        topic: "allergy_shrimp",
        content: "Allergic to shrimp",
        source: "agent",
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    {
      category: "workout_preference", // even if model miscategorizes
      content: "Allergic to shrimp",
      source: "agent",
    }
  );
  assert.strictEqual(res.result.operation, "NOOP");
  assert.strictEqual(res.memories.length, 1);
  console.log('✅ reconcileMemory prevents cross-category duplicate memories.');
}

// Test 4c: Candidate is negative statement with nothing in memory -> NOOP, does NOT add as new memory!
{
  const res = reconcileMemory(
    [
      {
        id: "mem-3",
        category: "workout_preference",
        topic: "equipment_pull_up_bar",
        content: "Available equipment: Pull-up bar",
        source: "agent",
        createdAt: 3000,
        updatedAt: 3000,
      },
    ],
    {
      category: "food_preference",
      content: "I don't allergic to shrimp",
      source: "agent",
    }
  );
  assert.strictEqual(res.result.operation, "NOOP");
  assert.strictEqual(res.memories.length, 1);
  console.log('✅ reconcileMemory never adds negative statement as a new memory.');
}

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
