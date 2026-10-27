import { decomposeMealText, decomposeMealWithGemma, MealDecompositionResult } from './mealDecomposer';
import { analyzeFoodWithGemini } from './geminiVisionService';
import { OpenAICompatibleConfig } from '@/types/model';
import { MealType } from '@/types/nutrition';
import { useModelStore } from '@/store/useModelStore';

export interface PhotoAnalysisResponse {
  canIdentify: boolean;
  dishTitle?: string;
  ingredientsText?: string;
  decomposition?: MealDecompositionResult;
  source: 'gemini_vision' | 'openai_vision' | 'user_prompt' | 'unidentified';
  requiresApiKey?: boolean;
  errorMessage?: string;
}

/**
 * Analyzes a meal photo using Google Gemini 3.8 Flash (free tier) or OpenAI-compatible vision.
 * Decomposes the detected meal plate and ingredients into macro nutrients via Gemma 2.
 */
export async function analyzeMealPhoto(
  photoUri: string,
  base64Data?: string | null,
  openAIConfig?: OpenAICompatibleConfig,
  currentMealType?: MealType,
  userNotes?: string,
  explicitGeminiKey?: string
): Promise<PhotoAnalysisResponse> {
  // If user already typed or selected notes, decompose their description directly
  if (userNotes && userNotes.trim().length > 0) {
    const decomposition = await decomposeMealWithGemma(userNotes.trim());
    decomposition.asFoodItem.imageUrl = photoUri;
    return {
      canIdentify: true,
      dishTitle: decomposition.dishTitle,
      ingredientsText: userNotes.trim(),
      decomposition,
      source: 'user_prompt',
    };
  }

  if (!base64Data) {
    return {
      canIdentify: false,
      source: 'unidentified',
      errorMessage: 'No image data captured. Please try taking the photo again.',
    };
  }

  // 1. Check for Google Gemini API Key (from explicit param, store, or openAIConfig)
  const storeGeminiKey = useModelStore.getState().geminiApiKey;
  const configApiKey = openAIConfig?.apiKey?.trim() || '';
  const geminiKey = (
    explicitGeminiKey ||
    storeGeminiKey ||
    (configApiKey.startsWith('AIza') ? configApiKey : '') ||
    openAIConfig?.geminiApiKey ||
    ''
  ).trim();

  if (geminiKey) {
    const preferredModel =
      openAIConfig?.baseUrl?.includes('generativelanguage.googleapis.com') && openAIConfig.modelName
        ? openAIConfig.modelName.trim()
        : undefined;
    const geminiResult = await analyzeFoodWithGemini(base64Data, geminiKey, preferredModel);
    if (geminiResult.success && geminiResult.ingredientsText) {
      try {
        const decomposition = await decomposeMealWithGemma(geminiResult.ingredientsText);
        decomposition.asFoodItem.imageUrl = photoUri;
        return {
          canIdentify: true,
          dishTitle: decomposition.dishTitle,
          ingredientsText: geminiResult.ingredientsText,
          decomposition,
          source: 'gemini_vision',
        };
      } catch (decompErr) {
        console.warn('[PhotoMealAnalyzer] Gemma decomposition fallback:', decompErr);
        const fallback = decomposeMealText(geminiResult.ingredientsText);
        fallback.asFoodItem.imageUrl = photoUri;
        return {
          canIdentify: true,
          dishTitle: fallback.dishTitle,
          ingredientsText: geminiResult.ingredientsText,
          decomposition: fallback,
          source: 'gemini_vision',
        };
      }
    } else {
      return {
        canIdentify: false,
        source: 'unidentified',
        errorMessage: geminiResult.errorMessage || "Could not identify food items in this photo.",
      };
    }
  }

  // 2. Check for OpenAI-compatible endpoint with vision (e.g., Ollama or OpenAI)
  if (openAIConfig && openAIConfig.baseUrl && openAIConfig.baseUrl.trim()) {
    try {
      let base = openAIConfig.baseUrl.trim().replace(/\/+$/, '');
      const url =
        base.endsWith('/v1') || base.includes('/v1/')
          ? `${base}/chat/completions`
          : `${base}/v1/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (openAIConfig.apiKey && openAIConfig.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${openAIConfig.apiKey.trim()}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: openAIConfig.modelName || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are a clinical sports nutritionist. Identify the meal plate or food dish in the image. Return a single concise string listing the ingredients and realistic weights in grams, separated by commas (e.g., "180g grilled chicken breast, 150g jasmine rice, 80g steamed broccoli"). If no food is found, reply with "UNIDENTIFIED".',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Identify this food plate and list ingredients with portion weights in grams:',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64Data}` },
                },
              ],
            },
          ],
          max_tokens: 180,
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content && !content.toUpperCase().includes('UNIDENTIFIED') && content.length > 3) {
          const decomposition = await decomposeMealWithGemma(content);
          decomposition.asFoodItem.imageUrl = photoUri;
          return {
            canIdentify: true,
            dishTitle: decomposition.dishTitle,
            ingredientsText: content,
            decomposition,
            source: 'openai_vision',
          };
        }
      }
    } catch (err) {
      console.warn('[PhotoMealAnalyzer] Vision API call error:', err);
    }
  }

  // 3. No vision provider configured
  return {
    canIdentify: false,
    requiresApiKey: true,
    source: 'unidentified',
    errorMessage:
      'Google AI Studio API key required for photo plate recognition. Add your free key in Settings, or describe ingredients in text for local Qwen 3 VL analysis.',
  };
}
