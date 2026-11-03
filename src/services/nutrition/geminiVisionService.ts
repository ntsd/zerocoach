/**
 * GeminiVisionService
 * Uses Google Gemini multimodal vision API to identify dishes, ingredients,
 * and portion weights from food photos.
 * Model: gemini-3.5-flash-lite (free tier: 15 RPM, 1,500 RPD at aistudio.google.com)
 */

export interface GeminiVisionResult {
  success: boolean;
  ingredientsText?: string;
  errorMessage?: string;
}

const DEFAULT_VISION_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_VISION_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export async function analyzeFoodWithGemini(
  base64Data: string,
  apiKey: string,
  preferredModel?: string,
  userNotes?: string
): Promise<GeminiVisionResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return {
      success: false,
      errorMessage: 'Google AI Studio API key is missing. Add your free key in Settings.',
    };
  }

  const primaryModel = preferredModel || DEFAULT_VISION_MODEL;
  const tryModels = [
    primaryModel,
    ...FALLBACK_VISION_MODELS.filter((m) => m !== primaryModel),
  ];

  const hintClause =
    userNotes && userNotes.trim().length > 0
      ? `USER HINT / CONTEXT: "${userNotes.trim()}". Honor any explicit portion weights, cooking methods, or ingredients mentioned by the user. `
      : '';

  const prompt =
    'You are an expert sports nutritionist and visual food portion analyzer. ' +
    'Analyze the food or beverage in this image. ' +
    hintClause +
    'Break down EVERY visible ingredient separately in the ingredients array (for composite dishes like sushi, rice bowls, burgers, pasta, or stir-fries, list each component separately, such as both the fish/meat topping AND the rice/noodles). ' +
    'If a fork, spoon, chopsticks, hand/thumb, or coin is visible next to the food, use it as a physical scale reference to calibrate the true portion size and gram weight of each ingredient. ' +
    'Estimate realistic COOKED/PREPARED portion weights in grams for each item. ' +
    'Return ONLY a valid JSON object with NO markdown backticks: ' +
    '{"dishTitle": "<Specific Dish Name>", "ingredients": [{"name": "<Component 1>", "quantityGrams": <grams>, "calories": <kcal>, "proteinGrams": <g>, "carbsGrams": <g>, "fatGrams": <g>, "fiberGrams": <g>, "sugarGrams": <g>}, {"name": "<Component 2>", "quantityGrams": <grams>, "calories": <kcal>, "proteinGrams": <g>, "carbsGrams": <g>, "fatGrams": <g>, "fiberGrams": <g>, "sugarGrams": <g>}]}. ' +
    'If no food or beverage is visible in the image, reply ONLY with {"error": "UNIDENTIFIED"}.';

  let lastErrorMsg = 'Failed to analyze food with Gemini';

  for (const model of tryModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 450,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (
          candidateText &&
          !candidateText.toUpperCase().includes('UNIDENTIFIED') &&
          candidateText.length > 2
        ) {
          console.log(`[GeminiVision] Successfully analyzed food using model: ${model}`);
          const cleaned = candidateText.replace(/[`*]/g, '').trim();
          return {
            success: true,
            ingredientsText: cleaned,
          };
        } else {
          return {
            success: false,
            errorMessage: 'Could not identify food items in the image. Please describe the meal below.',
          };
        }
      }

      const errText = await response.text();
      console.warn(`[GeminiVision] Model ${model} HTTP ${response.status}:`, errText);
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          lastErrorMsg = parsed.error.message;
        }
      } catch {
        lastErrorMsg = `Gemini returned HTTP ${response.status}`;
      }
    } catch (netErr: any) {
      if (netErr.name === 'AbortError') {
        return {
          success: false,
          errorMessage: 'Gemini request timed out',
        };
      }
      console.warn(`[GeminiVision] Network error on model ${model}:`, netErr);
      lastErrorMsg = netErr.message;
    }
  }

  return {
    success: false,
    errorMessage: lastErrorMsg,
  };
}
