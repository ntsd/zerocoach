import { Platform } from 'react-native';
import {
  decomposeMealText,
  decomposeMealWithGemma,
  parseVisionMealResponse,
  MealDecompositionResult,
} from './mealDecomposer';
import { analyzeFoodWithGemini } from './geminiVisionService';
import { OpenAICompatibleConfig } from '@/types/model';
import { MealType } from '@/types/nutrition';
import { useModelStore } from '@/store/useModelStore';
import { llmService } from '@/services/llm/llmService';

export interface PhotoAnalysisResponse {
  canIdentify: boolean;
  dishTitle?: string;
  ingredientsText?: string;
  decomposition?: MealDecompositionResult;
  source: 'local_vision' | 'gemini_vision' | 'openai_vision' | 'user_prompt' | 'unidentified';
  requiresApiKey?: boolean;
  requiresVisionProjector?: boolean;
  errorMessage?: string;
}

function formatIngredientsSummaryText(decomp: MealDecompositionResult): string {
  return decomp.ingredients
    .map((ing) => `${Math.round(ing.quantityGrams)}g ${ing.name}`)
    .join(', ');
}

/**
 * Analyzes a meal photo using on-device Qwen 3 VL vision, Google Gemini Flash, or OpenAI vision.
 * Uses single-pass Vision AI JSON estimation so cooked weights and calories come directly from the vision model.
 */
export async function analyzeMealPhoto(
  photoUri: string,
  base64Data?: string | null,
  openAIConfig?: OpenAICompatibleConfig,
  currentMealType?: MealType,
  userNotes?: string,
  explicitGeminiKey?: string
): Promise<PhotoAnalysisResponse> {
  const hintClean = (userNotes || '').trim();
  const visionPromptWithHint =
    'Analyze the food or meal in this image. ' +
    (hintClean
      ? `USER CONTEXT / HINT: "${hintClean}". Honor any explicit portion weights, ingredients, or cooking details provided by the user. `
      : '') +
    'Break down EVERY visible ingredient separately in the ingredients array (for composite dishes like sushi, rice bowls, burgers, pasta, or stir-fries, you MUST list each component separately, such as both the fish/meat topping AND the rice/noodles). ' +
    'If a fork, spoon, chopsticks, hand/thumb, or coin is visible next to the food, use it as a physical scale reference to calibrate the true portion size and gram weight of each ingredient. ' +
    'Estimate realistic cooked portion weights in grams for each component. ' +
    'Return ONLY a valid JSON object with NO markdown formatting: ' +
    '{"dishTitle": "<Specific Dish Name>", "ingredients": [{"name": "<Component 1>", "quantityGrams": <grams>, "calories": <kcal>, "proteinGrams": <g>, "carbsGrams": <g>, "fatGrams": <g>, "fiberGrams": <g>, "sugarGrams": <g>}, {"name": "<Component 2>", "quantityGrams": <grams>, "calories": <kcal>, "proteinGrams": <g>, "carbsGrams": <g>, "fatGrams": <g>, "fiberGrams": <g>, "sugarGrams": <g>}]}. ' +
    'If no food is visible, return {"error": "UNIDENTIFIED"}.';

  // 1. Check for Local Multimodal Vision (Qwen 3 VL with mmproj)
  const isLocalVisionModel = Boolean(useModelStore.getState().currentModel?.mmprojDownloadUrl);
  if (isLocalVisionModel && !llmService.isMultimodalReady() && Platform.OS !== 'web') {
    try {
      const state = useModelStore.getState();
      if (state.provider === 'on_device' && state.status !== 'loading' && state.status !== 'downloading') {
        console.log('[PhotoMealAnalyzer] Local vision not active in memory. Attempting auto-load from disk...');
        await state.loadModel();
      }
    } catch (e) {
      console.warn('[PhotoMealAnalyzer] Auto-load local vision failed:', e);
    }
  }

  if (isLocalVisionModel && llmService.isMultimodalReady()) {
    try {
      console.log('[PhotoMealAnalyzer] Analyzing photo with on-device Qwen 3 VL vision...');
      const visionOutput = await llmService.analyzeImageWithLocalVision(
        photoUri,
        visionPromptWithHint,
        base64Data
      );
      console.log('[PhotoMealAnalyzer] Qwen 3 VL vision output:', visionOutput);

      if (
        visionOutput &&
        !visionOutput.toUpperCase().includes('UNIDENTIFIED') &&
        visionOutput.trim().length > 3
      ) {
        const directDecomp = parseVisionMealResponse(visionOutput.trim(), hintClean);
        const decomposition = directDecomp || (await decomposeMealWithGemma(visionOutput.trim()));
        decomposition.asFoodItem.imageUrl = photoUri;
        return {
          canIdentify: true,
          dishTitle: decomposition.dishTitle,
          ingredientsText: formatIngredientsSummaryText(decomposition),
          decomposition,
          source: 'local_vision',
        };
      }
    } catch (localVisionErr) {
      console.warn('[PhotoMealAnalyzer] Local Qwen 3 VL vision error:', localVisionErr);
    }
  }

  if (!base64Data) {
    return {
      canIdentify: false,
      source: 'unidentified',
      errorMessage: 'No image data captured. Please try taking the photo again.',
    };
  }

  // 2. Check for Google Gemini API Key (cloud fallback)
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
    const geminiResult = await analyzeFoodWithGemini(
      base64Data,
      geminiKey,
      preferredModel,
      hintClean
    );
    if (geminiResult.success && geminiResult.ingredientsText) {
      try {
        const directDecomp = parseVisionMealResponse(geminiResult.ingredientsText, hintClean);
        const decomposition =
          directDecomp || (await decomposeMealWithGemma(geminiResult.ingredientsText));
        decomposition.asFoodItem.imageUrl = photoUri;
        return {
          canIdentify: true,
          dishTitle: decomposition.dishTitle,
          ingredientsText: formatIngredientsSummaryText(decomposition),
          decomposition,
          source: 'gemini_vision',
        };
      } catch (decompErr) {
        console.warn('[PhotoMealAnalyzer] Gemini decomposition fallback:', decompErr);
        const fallback = decomposeMealText(geminiResult.ingredientsText);
        fallback.asFoodItem.imageUrl = photoUri;
        return {
          canIdentify: true,
          dishTitle: fallback.dishTitle,
          ingredientsText: formatIngredientsSummaryText(fallback),
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

  // 3. Check for OpenAI-compatible endpoint with vision (avoid localhost network exceptions on device)
  const isLocalhost =
    openAIConfig?.baseUrl?.includes('localhost') || openAIConfig?.baseUrl?.includes('127.0.0.1');
  if (
    openAIConfig &&
    openAIConfig.baseUrl &&
    openAIConfig.baseUrl.trim() &&
    (!isLocalhost || Platform.OS === 'web')
  ) {
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
                'You are a clinical sports nutritionist and visual food portion estimator. Always output valid JSON with realistic cooked weights in grams and accurate cooked calories/macros (verify calories ≈ 4*proteinGrams + 4*carbsGrams + 9*fatGrams).',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: visionPromptWithHint,
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64Data}` },
                },
              ],
            },
          ],
          max_tokens: 420,
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content && !content.toUpperCase().includes('UNIDENTIFIED') && content.length > 3) {
          const directDecomp = parseVisionMealResponse(content, hintClean);
          const decomposition = directDecomp || (await decomposeMealWithGemma(content));
          decomposition.asFoodItem.imageUrl = photoUri;
          return {
            canIdentify: true,
            dishTitle: decomposition.dishTitle,
            ingredientsText: formatIngredientsSummaryText(decomposition),
            decomposition,
            source: 'openai_vision',
          };
        }
      }
    } catch (err) {
      console.warn('[PhotoMealAnalyzer] Vision API call error:', err);
    }
  }

  // 4. No vision provider configured or Vision Projector not downloaded / loaded
  const modelState = useModelStore.getState();
  const hasMmproj = Boolean(modelState.currentModel.mmprojDownloadUrl);
  const isMmprojMissing = hasMmproj && !modelState.isMmprojDownloaded;
  const isModelNotLoaded = modelState.status !== 'loaded';

  let errorMessage = 'Google AI Studio API key required for photo plate recognition. Add your free key in Settings, or describe ingredients in text for local Qwen 3 VL analysis.';
  if (isMmprojMissing) {
    errorMessage = 'Vision Projector (445 MB) required for offline camera recognition with Qwen 3 VL. Download it below, add a free Gemini API key in Settings, or describe the meal in text above.';
  } else if (hasMmproj && isModelNotLoaded) {
    errorMessage = 'Qwen 3 VL Vision is downloaded but not active in memory. Tap "ACTIVATE OFFLINE VISION" below to load into RAM.';
  }

  return {
    canIdentify: false,
    requiresVisionProjector: isMmprojMissing,
    requiresApiKey: !hasMmproj && !modelState.isMmprojDownloaded,
    source: 'unidentified',
    errorMessage,
  };
}
