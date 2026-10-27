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
      'Identify the meal plate or food dish in the image. Return a single concise string listing the ingredients and realistic weights in grams, separated by commas (e.g., "180g grilled chicken breast, 150g jasmine rice, 80g steamed broccoli").';

    const result = await this.nativeEngine.streamCompletion(
      {
        systemPrompt:
          'You are a clinical sports nutritionist. Identify the meal plate or food dish in the image. Return ingredients with portion weights in grams.',
        messages: [{ role: 'user', content: userPrompt }],
        mediaPaths: [mediaTarget],
        temperature: 0.6,
        maxTokens: 250,
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
      return 'Google Gemini 2.5 Flash';
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
