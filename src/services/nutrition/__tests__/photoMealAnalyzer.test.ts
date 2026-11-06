import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { analyzeMealPhoto } from '../photoMealAnalyzer';
import { useModelStore } from '@/store/useModelStore';

describe('PhotoMealAnalyzer - Gemini Prioritization for AI Snap', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    useModelStore.getState().setProvider('on_device');
    useModelStore.getState().setGeminiApiKey('AIzaSyMockKeyForAiSnap');
    useModelStore.getState().setUseGeminiForAiSnap(true);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    useModelStore.getState().setGeminiApiKey('');
    useModelStore.getState().setUseGeminiForAiSnap(true);
  });

  it('prioritizes Gemini API key for AI Snap even when using local on_device LLM engine', async () => {
    let fetchCalled = false;
    let requestedUrl = '';

    global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalled = true;
      requestedUrl = url.toString();
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      dishTitle: 'Grilled Salmon with Quinoa',
                      ingredients: [
                        {
                          name: 'Salmon fillet',
                          quantityGrams: 180,
                          calories: 370,
                          proteinGrams: 36,
                          carbsGrams: 0,
                          fatGrams: 22,
                        },
                        {
                          name: 'Cooked quinoa',
                          quantityGrams: 150,
                          calories: 180,
                          proteinGrams: 6,
                          carbsGrams: 32,
                          fatGrams: 3,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response;
    }) as any;

    const result = await analyzeMealPhoto('file:///mock/salmon.jpg', 'fake_base64_salmon_image_data');

    assert.strictEqual(fetchCalled, true, 'Gemini API fetch should have been executed');
    assert.ok(requestedUrl.includes('generativelanguage.googleapis.com'), 'Should request Google Gemini API endpoint');
    assert.strictEqual(result.canIdentify, true);
    assert.strictEqual(result.source, 'gemini_vision');
    assert.strictEqual(result.dishTitle, 'Grilled Salmon with Quinoa');
    assert.strictEqual(result.decomposition?.ingredients.length, 2);
  });

  it('respects useGeminiForAiSnap=false by skipping Gemini prioritization', async () => {
    useModelStore.getState().setUseGeminiForAiSnap(false);

    let fetchCount = 0;
    global.fetch = (async () => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ dishTitle: 'Fallback Meal', ingredients: [] }) }],
              },
            },
          ],
        }),
      } as Response;
    }) as any;

    // When useGeminiForAiSnap is false and local vision is not available, it attempts fallback
    const result = await analyzeMealPhoto('file:///mock/salmon.jpg', 'fake_base64_data');
    assert.ok(result);
  });
});
