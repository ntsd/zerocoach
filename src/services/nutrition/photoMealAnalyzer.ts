import { decomposeMealText, MealDecompositionResult } from './mealDecomposer';
import { OpenAICompatibleConfig } from '@/types/model';
import { MealType } from '@/types/nutrition';

export interface PhotoAnalysisResponse {
  canIdentify: boolean;
  dishTitle?: string;
  ingredientsText?: string;
  decomposition?: MealDecompositionResult;
  source: 'openai_vision' | 'user_prompt' | 'unidentified';
  errorMessage?: string;
}

/**
 * Analyzes a meal photo using OpenAI-compatible vision if available.
 * If vision is not configured, unavailable, or cannot identify the meal,
 * returns canIdentify: false so the UI clearly tells the user
 * "Can't identify food from the image".
 */
export async function analyzeMealPhoto(
  photoUri: string,
  base64Data?: string | null,
  openAIConfig?: OpenAICompatibleConfig,
  currentMealType?: MealType,
  userNotes?: string
): Promise<PhotoAnalysisResponse> {
  // If user already typed or selected notes, decompose their description directly
  if (userNotes && userNotes.trim().length > 0) {
    const decomposition = decomposeMealText(userNotes.trim());
    decomposition.asFoodItem.imageUrl = photoUri;
    return {
      canIdentify: true,
      dishTitle: decomposition.dishTitle,
      ingredientsText: userNotes.trim(),
      decomposition,
      source: 'user_prompt',
    };
  }

  // If OpenAI-compatible endpoint with vision is available and base64 is provided
  if (base64Data && openAIConfig && openAIConfig.baseUrl && openAIConfig.apiKey) {
    try {
      let base = openAIConfig.baseUrl.trim().replace(/\/+$/, '');
      const url =
        base.endsWith('/v1') || base.includes('/v1/')
          ? `${base}/chat/completions`
          : `${base}/v1/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAIConfig.apiKey.trim()}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: openAIConfig.modelName || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are a clinical sports nutritionist and multimodal food & menu analyzer. Analyze the image, which may be: 1) A photo of an actual meal or dish, 2) A printed or digital restaurant menu, blackboard, or receipt with food text, or 3) A packaged food nutrition facts or ingredients label. If it is a menu, receipt, or label, read the text, extract the primary meal or dish, and break down its ingredients with realistic restaurant portion weights in grams. Return a single concise string listing the ingredients and weights in grams, separated by commas (e.g., "180g grilled chicken breast, 150g jasmine rice, 80g steamed broccoli"). If neither food nor readable food menu/label text is found, reply with "UNIDENTIFIED".',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Identify the meal plate or read the food menu/label, and list ingredients with portion weights in grams:',
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
          const decomposition = decomposeMealText(content);
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

  // Quick 600ms latency to provide visual feedback before returning
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Cannot identify food or menu text from the image
  return {
    canIdentify: false,
    source: 'unidentified',
    errorMessage: "Can't identify food or menu text from the image. Please describe the meal or select below.",
  };
}
