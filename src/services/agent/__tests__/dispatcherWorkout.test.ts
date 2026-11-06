import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { executeTool } from '../dispatcher';
import { exerciseRepository } from '../../workout/exerciseRepository';
import { useWorkoutStore } from '@/store/useWorkoutStore';

describe('Workout Dispatcher & Repository Tests', () => {
  beforeEach(() => {
    const store = useWorkoutStore.getState();
    store.clearPlanForDate('2026-11-06');
    store.removeWorkoutForDate('2026-11-06');
  });

  it('ranks exact and primary exercise matches first in exerciseRepository.search', () => {
    const pushupResults = exerciseRepository.search('push up');
    assert.strictEqual(pushupResults[0].id, 'push-up', 'push up query should rank standard push-up first');
    assert.strictEqual(pushupResults[0].name_en, 'Push-Up');

    const pullupResults = exerciseRepository.search('pull up');
    assert.strictEqual(pullupResults[0].id, 'pull-up', 'pull up query should rank standard pull-up first');
    assert.strictEqual(pullupResults[0].name_en, 'Pull-Up');
  });

  it('update_workout_plan normalizes split and updates workout plan and cycle step', async () => {
    const result = await executeTool({
      id: 'call-update-1',
      name: 'update_workout_plan',
      arguments: {
        date: '2026-11-06',
        title: 'Push Day Hypertrophy',
        split: 'PUSH (Active Cycle: PULL → PUSH → PULL → PUSH → LEGS)',
        exercises: [
          { name: 'Push-up', targetSets: 3, targetReps: '10-12 reps' },
          { name: 'Pike push-ups', targetSets: 3, targetReps: '8-10 reps' },
        ],
      },
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.split, 'push');

    const store = useWorkoutStore.getState();
    const savedPlan = store.getPlanForDate('2026-11-06');
    assert.ok(savedPlan, 'Plan should be saved in store');
    assert.strictEqual(savedPlan.selectedSplit, 'push', 'Split should be normalized to push');
    assert.strictEqual(savedPlan.exercises.length, 2);
    assert.strictEqual(savedPlan.exercises[0].id, 'push-up');

    const scheduled = store.getScheduledCycleStepForDate('2026-11-06');
    assert.strictEqual(scheduled.split, 'push');
  });

  it('log_completed_workout keeps remaining plan movements and marks logged exercise completed', async () => {
    const store = useWorkoutStore.getState();

    // First save a 3-exercise push plan
    await executeTool({
      id: 'call-plan-1',
      name: 'update_workout_plan',
      arguments: {
        date: '2026-11-06',
        title: 'Push Day Routine',
        split: 'push',
        exercises: [
          { name: 'Push-up', targetSets: 3, targetReps: '10 reps' },
          { name: 'Pike push-ups', targetSets: 3, targetReps: '8 reps' },
          { name: 'Dips', targetSets: 3, targetReps: '10 reps' },
        ],
      },
    });

    // Now user logs 5 reps of pushups
    const logResult = await executeTool({
      id: 'call-log-1',
      name: 'log_completed_workout',
      arguments: {
        date: '2026-11-06',
        exercise: 'Push-up',
        sets: 1,
        reps: 5,
      },
    });

    assert.strictEqual(logResult.success, true);

    const session = store.getWorkoutForDate('2026-11-06');
    assert.ok(session, 'Session should exist for today');
    assert.strictEqual(session.totalMovements, 3, 'Should retain all 3 planned movements');
    assert.strictEqual(session.completedMovements, 1, 'Only 1 movement should be completed');
    assert.ok(session.completedExerciseIds.includes('push-up'), 'Push-up should be marked as completed');
  });

  it('update_workout_plan preserves previously completed matching movements', async () => {
    const store = useWorkoutStore.getState();

    // Log pushups first
    await executeTool({
      id: 'call-log-initial',
      name: 'log_completed_workout',
      arguments: {
        date: '2026-11-06',
        exercise: 'Push-up',
        sets: 2,
        reps: 10,
      },
    });

    let session = store.getWorkoutForDate('2026-11-06');
    assert.ok(session);
    assert.ok(session.completedExerciseIds.length > 0);

    // Now update/generate full plan containing Push-up + other exercises
    await executeTool({
      id: 'call-update-new',
      name: 'update_workout_plan',
      arguments: {
        date: '2026-11-06',
        title: 'Full Push Routine',
        split: 'push',
        exercises: [
          { name: 'Push-up', targetSets: 3, targetReps: '12 reps' },
          { name: 'Diamond Push-ups', targetSets: 3, targetReps: '10 reps' },
        ],
      },
    });

    session = store.getWorkoutForDate('2026-11-06');
    assert.ok(session, 'Session should be updated with new plan');
    assert.strictEqual(session.totalMovements, 2);
    assert.strictEqual(session.completedMovements, 1);
    assert.strictEqual(session.completedExerciseIds[0], 'push-up');
  });

  it('setSplitForDate preserves existing plan if split matches', () => {
    const store = useWorkoutStore.getState();
    store.savePlanForDate('2026-11-06', {
      id: 'plan-push-1',
      title: 'My Push Plan',
      focusSummary: '',
      tier: 'optimal',
      tierLabel: 'Optimal',
      readinessMultiplierDesc: '',
      estimatedDurationMin: 30,
      exercises: [],
      coachingNotes: '',
      generatedDate: '2026-11-06',
      selectedSplit: 'push',
    });

    store.setSplitForDate('2026-11-06', 'push');
    const planAfter = store.getPlanForDate('2026-11-06');
    assert.ok(planAfter, 'Plan should be preserved when setting the same split');
    assert.strictEqual(planAfter.id, 'plan-push-1');

    store.setSplitForDate('2026-11-06', 'pull');
    const planAfterDifferent = store.getPlanForDate('2026-11-06');
    assert.strictEqual(planAfterDifferent, undefined, 'Plan should be cleared when switching to a different split');
  });
});
