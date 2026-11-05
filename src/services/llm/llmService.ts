import { Platform } from 'react-native';
import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';
import { LlamaRNEngine } from './llamaRNEngine';
import { OpenAICompatibleEngine, OpenAICompatibleEngineConfig } from './openAICompatibleEngine';
import { GeminiEngine, GeminiEngineConfig } from './geminiEngine';
import { LLMProviderType } from '@/types/model';
import { useModelStore } from '@/store/useModelStore';

export class LLMService {
  private nativeEngine: LlamaRNEngine;
  private openAIEngine: OpenAICompatibleEngine;
  private geminiEngine: GeminiEngine;
  private provider: LLMProviderType = 'on_device';

  constructor() {
    this.nativeEngine = new LlamaRNEngine();
    this.openAIEngine = new OpenAICompatibleEngine();
    this.geminiEngine = new GeminiEngine();
  }

  public setProvider(provider: LLMProviderType): void {
    this.provider = provider;
  }

  public getProvider(): LLMProviderType {
    return this.provider;
  }

  public updateOpenAIConfig(config: Partial<OpenAICompatibleEngineConfig>): void {
    this.openAIEngine.updateConfig(config);
  }

  public getOpenAIConfig(): OpenAICompatibleEngineConfig {
    return this.openAIEngine.getConfig();
  }

  public updateGeminiConfig(config: Partial<GeminiEngineConfig>): void {
    this.geminiEngine.updateConfig(config);
  }

  public async testOpenAIConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    return this.openAIEngine.testConnection();
  }

  public async testGeminiConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    return this.geminiEngine.testConnection();
  }

  public isNativeReady(): boolean {
    return this.nativeEngine.isReady();
  }

  public getLoadedModelPath(): string | null {
    return this.nativeEngine.getLoadedModelPath();
  }

  public async initMultimodal(mmprojPath: string): Promise<boolean> {
    return this.nativeEngine.initMultimodal(mmprojPath);
  }

  public async ensureMultimodalLoaded(mmprojPath?: string): Promise<boolean> {
    if (this.isMultimodalReady()) return true;
    if (!mmprojPath) return false;
    return this.initMultimodal(mmprojPath);
  }

  public async releaseMultimodal(): Promise<void> {
    await this.nativeEngine.releaseMultimodal();
  }

  public isMultimodalReady(): boolean {
    return this.nativeEngine.isMultimodalEnabled();
  }

  public async analyzeImageWithLocalVision(
    imageUri: string,
    prompt?: string,
    base64Data?: string | null
  ): Promise<string> {
    // If base64 data is available, feed data URI directly to rn-mtmd to bypass Android POSIX fopen limitations
    let mediaTarget: string;
    if (base64Data && base64Data.length > 50) {
      mediaTarget = `data:image/jpeg;base64,${base64Data}`;
    } else {
      mediaTarget = decodeURIComponent(imageUri.replace(/^file:\/\//, ''));
    }

    const userPrompt =
      prompt ||
      'Analyze the food or meal in this image. Break down EVERY visible ingredient separately in the ingredients array (for composite dishes like sushi, rice bowls, burgers, pasta, or stir-fries, list both the protein/topping AND the rice/base as separate items). If a fork, spoon, chopsticks, hand/thumb, or coin is visible next to the food, use it as a physical scale reference to calibrate the true portion size and gram weight of each ingredient. Estimate realistic cooked portion weights in grams. Return ONLY a valid JSON object with NO markdown formatting: {"dishTitle": "<Specific Dish Name>", "ingredients": [{"name": "<Component 1>", "quantityGrams": <grams>, "calories": <kcal>, "proteinGrams": <g>, "carbsGrams": <g>, "fatGrams": <g>, "fiberGrams": <g>, "sugarGrams": <g>}, {"name": "<Component 2>", "quantityGrams": <grams>, "calories": <kcal>, "proteinGrams": <g>, "carbsGrams": <g>, "fatGrams": <g>, "fiberGrams": <g>, "sugarGrams": <g>}]}. If no food is visible, return {"error": "UNIDENTIFIED"}.';

    const result = await this.nativeEngine.streamCompletion(
      {
        systemPrompt:
          'You are a clinical sports nutritionist and visual portion estimator. Always output valid JSON with realistic cooked weights in grams and accurate cooked calories/macros (verify calories ≈ 4*proteinGrams + 4*carbsGrams + 9*fatGrams).',
        messages: [{ role: 'user', content: userPrompt }],
        mediaPaths: [mediaTarget],
        temperature: 0.1,
        maxTokens: 420,
      },
      () => {}
    );

    return result.fullText;
  }

  public isReady(): boolean {
    if (this.provider === 'gemini') {
      const geminiKey = useModelStore.getState().geminiApiKey;
      if (geminiKey && geminiKey.trim()) {
        this.geminiEngine.updateConfig({ apiKey: geminiKey.trim() });
      }
      return this.geminiEngine.isReady();
    }

    if (this.provider === 'openai_compatible') {
      return this.openAIEngine.isReady();
    }

    // provider === 'on_device'
    return Platform.OS !== 'web' && this.nativeEngine.isReady();
  }

  public getActiveEngine(): LLMEngine {
    // 1. Explicit Gemini Provider
    if (this.provider === 'gemini') {
      const geminiKey = useModelStore.getState().geminiApiKey;
      if (geminiKey && geminiKey.trim()) {
        this.geminiEngine.updateConfig({ apiKey: geminiKey.trim() });
      }
      if (this.geminiEngine.isReady()) {
        return this.geminiEngine;
      }
      throw new Error(
        'Google Gemini API key is missing. Please set your Gemini API key in Settings.'
      );
    }

    // 2. Explicit OpenAI-Compatible Provider
    if (this.provider === 'openai_compatible') {
      if (this.openAIEngine.isReady()) {
        return this.openAIEngine;
      }
      throw new Error(
        'OpenAI endpoint URL is missing. Please configure your OpenAI settings in Settings.'
      );
    }

    // 3. On-Device Mode:
    // If native weights are loaded in RAM, use native llama.rn!
    if (Platform.OS !== 'web' && this.nativeEngine.isReady()) {
      return this.nativeEngine;
    }

    throw new Error(
      'On-device model weights are not loaded. Please download and load the model in Settings, or select Google Gemini.'
    );
  }

  public getActiveEngineName(): 'on_device' | 'gemini' | 'openai' | 'none' {
    if (this.provider === 'gemini') {
      return this.isReady() ? 'gemini' : 'none';
    }
    if (this.provider === 'openai_compatible') {
      return this.isReady() ? 'openai' : 'none';
    }
    if (Platform.OS !== 'web' && this.nativeEngine.isReady()) {
      return 'on_device';
    }
    return 'none';
  }

  public getActiveModelName(): string {
    const modelState = useModelStore.getState();
    if (this.provider === 'gemini') {
      const configModel = this.geminiEngine.getConfig().modelName;
      return configModel ? `Google Gemini (${configModel})` : 'Gemini 3.5 Flash Lite';
    }
    if (this.provider === 'openai_compatible') {
      return modelState.openAIConfig.modelName || 'OpenAI Compatible';
    }
    return modelState.currentModel?.name || 'ZeroCoach Athletic AI';
  }

  public async initialize(modelPath?: string): Promise<boolean> {
    if (modelPath) {
      const nativeOk = await this.nativeEngine.initialize(modelPath);
      if (nativeOk) {
        this.provider = 'on_device';
        return true;
      }
    }
    return false;
  }

  public async streamCompletion(
    request: CompletionRequest,
    onToken: TokenCallback
  ): Promise<CompletionResult> {
    const engine = this.getActiveEngine();
    return engine.streamCompletion(request, onToken);
  }

  public stopCompletion(): void {
    this.nativeEngine.stopCompletion();
    this.geminiEngine.stopCompletion();
    this.openAIEngine.stopCompletion();
  }

  public async unload(): Promise<void> {
    await this.nativeEngine.unload();
    await this.geminiEngine.unload();
    await this.openAIEngine.unload();
  }
}

export const llmService = new LLMService();
