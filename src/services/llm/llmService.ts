import { Platform } from 'react-native';
import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';
import { SimulatorEngine } from './simulatorEngine';
import { LlamaRNEngine } from './llamaRNEngine';
import { OpenAICompatibleEngine, OpenAICompatibleEngineConfig } from './openAICompatibleEngine';
import { GeminiEngine, GeminiEngineConfig } from './geminiEngine';
import { LLMProviderType } from '@/types/model';
import { useModelStore } from '@/store/useModelStore';

export class LLMService {
  private simulator: SimulatorEngine;
  private nativeEngine: LlamaRNEngine;
  private openAIEngine: OpenAICompatibleEngine;
  private geminiEngine: GeminiEngine;
  private provider: LLMProviderType = 'on_device';

  constructor() {
    this.simulator = new SimulatorEngine();
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

  public getActiveEngine(): LLMEngine {
    // 1. Explicit Gemini Provider
    if (this.provider === 'gemini') {
      const geminiKey = useModelStore.getState().geminiApiKey;
      if (geminiKey) {
        this.geminiEngine.updateConfig({ apiKey: geminiKey });
      }
      if (this.geminiEngine.isReady()) {
        return this.geminiEngine;
      }
      return this.simulator;
    }

    // 2. Explicit OpenAI-Compatible Provider
    if (this.provider === 'openai_compatible') {
      return this.openAIEngine;
    }

    // 3. On-Device Mode:
    // If native weights are loaded in RAM, use native llama.rn!
    if (Platform.OS !== 'web' && this.nativeEngine.isReady()) {
      return this.nativeEngine;
    }

    // Auto-fallback to Gemini if key is provided and local weights are not loaded yet
    const geminiKey = useModelStore.getState().geminiApiKey;
    if (geminiKey && geminiKey.trim()) {
      this.geminiEngine.updateConfig({ apiKey: geminiKey.trim() });
      if (this.geminiEngine.isReady()) {
        return this.geminiEngine;
      }
    }

    // Otherwise use sovereign context simulator
    return this.simulator;
  }

  public getActiveEngineName(): 'on_device' | 'gemini' | 'openai' | 'simulator' {
    const active = this.getActiveEngine();
    if (active === this.nativeEngine) return 'on_device';
    if (active === this.geminiEngine) return 'gemini';
    if (active === this.openAIEngine) return 'openai';
    return 'simulator';
  }

  public async initialize(modelPath?: string): Promise<boolean> {
    if (modelPath) {
      const nativeOk = await this.nativeEngine.initialize(modelPath);
      if (nativeOk) {
        this.provider = 'on_device';
        return true;
      }
    }
    return this.simulator.initialize();
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
    this.simulator.stopCompletion();
    this.openAIEngine.stopCompletion();
  }

  public async unload(): Promise<void> {
    await this.nativeEngine.unload();
    await this.geminiEngine.unload();
    await this.simulator.unload();
    await this.openAIEngine.unload();
  }
}

export const llmService = new LLMService();
