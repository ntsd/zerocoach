import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyUserIntent, ALL_DOMAINS, SAFE_READ_DOMAINS } from '../intentRouter';

describe('classifyUserIntent', () => {
  it('classifies single-domain food_history query and includes ambient memory', () => {
    const domains = classifyUserIntent('Log 200 grams of grilled chicken breast for lunch');
    assert.ok(domains.includes('food_history'), 'Should include food_history');
    assert.ok(domains.includes('memory'), 'Should unconditionally include memory');
    assert.strictEqual(domains.includes('workout_plan'), false);
  });

  it('classifies food_database query', () => {
    const domains = classifyUserIntent('Search food database for calories in avocado');
    assert.ok(domains.includes('food_database'), 'Should include food_database');
    assert.ok(domains.includes('memory'), 'Should include memory');
  });

  it('classifies workout_plan query', () => {
    const domains = classifyUserIntent('Swap squats for leg press in today workout routine');
    assert.ok(domains.includes('workout_plan'), 'Should include workout_plan');
    assert.ok(domains.includes('memory'), 'Should include memory');
  });

  it('classifies workout_history query', () => {
    const domains = classifyUserIntent('Completed workout: 4 sets bench press RPE 8');
    assert.ok(domains.includes('workout_history'), 'Should include workout_history');
    assert.ok(domains.includes('memory'), 'Should include memory');

    const pastLogged = classifyUserIntent('I did 10 reps push up 2 sets');
    assert.ok(pastLogged.includes('workout_history'), 'Should include workout_history for "did 10 reps push up 2 sets"');

    const finishedExercise = classifyUserIntent('did 2 sets of 10 pushups');
    assert.ok(finishedExercise.includes('workout_history'), 'Should include workout_history for "did 2 sets of 10 pushups"');

    const doneExercise = classifyUserIntent('pushups 10 reps done');
    assert.ok(doneExercise.includes('workout_history'), 'Should include workout_history for "pushups 10 reps done"');

    const thaiExercise = classifyUserIntent('วิดพื้นไป 2 เซ็ต 10 ครั้ง');
    assert.ok(thaiExercise.includes('workout_history'), 'Should include workout_history for Thai exercise log');
  });

  it('classifies workout_database query', () => {
    const domains = classifyUserIntent('Search exercise details and form cues for romanian deadlift');
    assert.ok(domains.includes('workout_database'), 'Should include workout_database');
    assert.ok(domains.includes('memory'), 'Should include memory');
  });

  it('classifies telemetry query', () => {
    const domains = classifyUserIntent('What is my readiness score, hrv, and sleep duration today?');
    assert.ok(domains.includes('telemetry'), 'Should include telemetry');
    assert.ok(domains.includes('memory'), 'Should include memory');
  });

  it('classifies settings query', () => {
    const domains = classifyUserIntent('Update my weight to 78kg and target calories to 2500');
    assert.ok(domains.includes('settings'), 'Should include settings');
    assert.ok(domains.includes('memory'), 'Should include memory');
  });

  it('mounts natural union for cross-domain queries', () => {
    const domains = classifyUserIntent('I ate 200g steak for lunch and finished 5 sets of bench press');
    assert.ok(domains.includes('food_history'), 'Should include food_history');
    assert.ok(domains.includes('workout_plan') || domains.includes('workout_history'), 'Should include workout domain');
    assert.ok(domains.includes('memory'), 'Should include memory');
  });

  it('supports Thai language keyword queries', () => {
    const thaiFood = classifyUserIntent('กินอกไก่ 200 กรัม มื้อเที่ยง');
    assert.ok(thaiFood.includes('food_history'), 'Should match Thai food keyword');
    assert.ok(thaiFood.includes('memory'), 'Should include memory');

    const thaiWorkout = classifyUserIntent('เปลี่ยนท่าซ้อมเป็น leg press');
    assert.ok(thaiWorkout.includes('workout_plan'), 'Should match Thai workout keyword');
    assert.ok(thaiWorkout.includes('memory'), 'Should include memory');

    const thaiTelemetry = classifyUserIntent('ความพร้อมและการนอนวันนี้');
    assert.ok(thaiTelemetry.includes('telemetry'), 'Should match Thai telemetry keyword');
    assert.ok(thaiTelemetry.includes('memory'), 'Should include memory');
  });

  it('inherits previous domain when current query uses anaphoric pronouns', () => {
    const history = [
      { role: 'user', content: 'What are some high protein meals for lunch?' },
      { role: 'assistant', content: 'Grilled chicken breast with rice or salmon bowl.' },
    ];
    const domains = classifyUserIntent('Log it', history);
    assert.ok(domains.includes('food_history'), 'Should inherit food_history from previous turns');
    assert.ok(domains.includes('memory'), 'Should include memory');
  });

  it('inherits Thai anaphoric action cues', () => {
    const history = [
      { role: 'user', content: 'มีเมนูโปรตีนสูงอะไรบ้าง' },
      { role: 'assistant', content: 'อกไก่ต้ม หรือปลาแซลมอนย่าง' },
    ];
    const domains = classifyUserIntent('บันทึกเลย', history);
    assert.ok(domains.includes('food_history'), 'Should inherit food_history from Thai conversation');
    assert.ok(domains.includes('memory'), 'Should include memory');
  });

  it('classifies dedicated memory queries into scoped memory domain', () => {
    const prefDomains = classifyUserIntent("I don't like shrimp");
    assert.deepStrictEqual(prefDomains, ['memory'], 'Should scope exclusively to memory');

    const removeDomains = classifyUserIntent("Remove that I don't like shrimp, I actually like shrimp");
    assert.deepStrictEqual(removeDomains, ['memory'], 'Should scope removal request to memory');

    const equipDomains = classifyUserIntent('I bought a pull-up bar');
    assert.deepStrictEqual(equipDomains, ['memory'], 'Should scope equipment purchase to memory');
  });

  it('falls back to safe read domains on casual chat, greeting, or ambiguous phrasing', () => {
    const greetingDomains = classifyUserIntent('Hello coach, tell me a joke');
    assert.deepStrictEqual(new Set(greetingDomains), new Set(SAFE_READ_DOMAINS), 'Should fall back to safe read domains');

    const emptyDomains = classifyUserIntent('');
    assert.deepStrictEqual(new Set(emptyDomains), new Set(SAFE_READ_DOMAINS), 'Should fall back to safe read domains for empty input');
  });

  it('never arms mutation domains for advisory or recommendation queries', () => {
    const foodSuggestion = classifyUserIntent('suggest food');
    assert.strictEqual(foodSuggestion.includes('food_history'), false, 'suggest food should NOT mount food_history');
    assert.ok(foodSuggestion.includes('memory'), 'Must include memory');

    const workoutSuggestion = classifyUserIntent('suggest workout');
    assert.strictEqual(workoutSuggestion.includes('workout_plan'), false, 'suggest workout should NOT mount workout_plan');
    assert.strictEqual(workoutSuggestion.includes('workout_history'), false, 'suggest workout should NOT mount workout_history');

    const mealInquiry = classifyUserIntent('what should I eat?');
    assert.strictEqual(mealInquiry.includes('food_history'), false, 'what should I eat should NOT mount food_history');

    const thaiFoodSuggestion = classifyUserIntent('แนะนำอาหารหน่อย');
    assert.strictEqual(thaiFoodSuggestion.includes('food_history'), false, 'แนะนำอาหาร should NOT mount food_history');

    const thaiMealInquiry = classifyUserIntent('ควรกินอะไรดี');
    assert.strictEqual(thaiMealInquiry.includes('food_history'), false, 'ควรกินอะไรดี should NOT mount food_history');
  });
});

