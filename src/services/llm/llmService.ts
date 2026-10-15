import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';
import { SimulatorEngine } from './simulatorEngine';
import { LlamaRNEngine } from './llamaRNEngine';

export class LLMService {
  private simulator: SimulatorEngine;
  private nativeEngine: LlamaRNEngine;
  private preferNative: boolean = false;

  constructor() {
    this.simulator = new SimulatorEngine();
    this.nativeEngine = new LlamaRNEngine();
  }

  public setPreferNative(value: boolean) {
    this.preferNative = value;
  }

  public getActiveEngine(): LLMEngine {
    if (this.preferNative && this.nativeEngine.isReady()) {
      return this.nativeEngine;
    }
    return this.simulator;
  }

  public async initialize(modelPath?: string): Promise<boolean> {
    if (modelPath) {
      const nativeOk = await this.nativeEngine.initialize(modelPath);
      if (nativeOk) {
        this.preferNative = true;
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
  }

  public async unload(): Promise<void> {
    await this.nativeEngine.unload();
    await this.simulator.unload();
  }
}

export const llmService = new LLMService();
