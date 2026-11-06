import { describe, it } from 'node:test';
import assert from 'node:assert';
import { useModelStore } from '../useModelStore';

describe('useModelStore - Multimodal Lazy Lifecycle', () => {
  it('initializes with isVisionProjectorLoaded set to false', () => {
    const state = useModelStore.getState();
    assert.strictEqual(
      state.isVisionProjectorLoaded,
      false,
      'Vision projector should not be loaded in memory at startup'
    );
  });

  it('safely unloads vision projector and resets memory flag', async () => {
    const store = useModelStore.getState();
    await store.unloadVisionProjector();
    const state = useModelStore.getState();
    assert.strictEqual(
      state.isVisionProjectorLoaded,
      false,
      'isVisionProjectorLoaded should remain false after unload'
    );
  });

  it('unloadModel calls unloadVisionProjector and sets ready status', async () => {
    const store = useModelStore.getState();
    await store.unloadModel();
    const state = useModelStore.getState();
    assert.strictEqual(state.isVisionProjectorLoaded, false);
    assert.strictEqual(state.status, 'ready');
  });

  it('initializes useGeminiForAiSnap to true and allows toggling', () => {
    const store = useModelStore.getState();
    assert.strictEqual(store.useGeminiForAiSnap, true, 'Should default to prioritizing Gemini for AI Snap');

    store.setUseGeminiForAiSnap(false);
    assert.strictEqual(useModelStore.getState().useGeminiForAiSnap, false);

    store.setUseGeminiForAiSnap(true);
    assert.strictEqual(useModelStore.getState().useGeminiForAiSnap, true);
  });
});

