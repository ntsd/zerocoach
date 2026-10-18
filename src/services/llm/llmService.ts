import { Platform } from 'react-native';
import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';
import { SimulatorEngine } from './simulatorEngine';
import { LlamaRNEngine } from './llamaRNEngine';
import { OpenAICompatibleEngine, OpenAICompatibleEngineConfig } from './openAICompatibleEngine';
import { LLMProviderType } from '@/types/model';

export class LLMService {
  private simulator: SimulatorEngine;
  private nativeEngine: LlamaRNEngine;
  private openAIEngine: OpenAICompatibleEngine;
  private provider: LLMProviderType = 'on_device';

  constructor() {
    this.simulator = new SimulatorEngine();
    this.nativeEngine = new LlamaRNEngine();
    this.openAIEngine = new OpenAICompatibleEngine();
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

  public async testOpenAIConnection(): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    return this.openAIEngine.testConnection();
  }

  public isNativeReady(): boolean {
    return this.nativeEngine.isReady();
  }

  public getLoadedModelPath(): string | null {
    return this.nativeEngine.getLoadedModelPath();
  }

  public getActiveEngine(): LLMEngine {
    if (this.provider === 'openai_compatible') {
      return this.openAIEngine;
    }

    // On-Device Mode:
    // When running in the browser (web), automatically route to the token streaming simulator
    if (Platform.OS === 'web') {
      return this.simulator;
    }

    // On mobile devices (iOS / Android), use native llama.rn if weights are loaded
    if (this.nativeEngine.isReady()) {
      return this.nativeEngine;
    }

    // Fallback if weights are not yet loaded
    return this.simulator;
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
    this.simulator.stopCompletion();
    this.openAIEngine.stopCompletion();
  }

  public async unload(): Promise<void> {
    await this.nativeEngine.unload();
    await this.simulator.unload();
    await this.openAIEngine.unload();
  }
}

export const llmService = new LLMService();
