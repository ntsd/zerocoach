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
  preferredModel?: string
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

  const prompt =
    'You are an expert sports nutritionist and computer vision meal analyzer. ' +
    'Analyze the food or meal in this image. Identify all visible ingredients, cooked dishes, fruits, vegetables, meats, grains, snacks, desserts, or drinks. ' +
    'Estimate their realistic portion weights in grams based on visual appearance. ' +
    'Return ONLY a single concise comma-separated string listing the ingredients and weights (e.g., "180g grilled chicken breast, 150g jasmine rice, 80g steamed broccoli" or "100g chocolate lava cake, 30g fresh strawberries, 20g berry compote"). ' +
    'Do NOT include any conversational filler, preamble, markdown asterisks, or bullet points. ' +
    'If no food or beverage is visible in the image, reply ONLY with "UNIDENTIFIED".';

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
            maxOutputTokens: 220,
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
