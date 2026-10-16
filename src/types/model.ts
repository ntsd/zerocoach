export type ModelStatus =
  | 'unloaded'
  | 'downloading'
  | 'ready'
  | 'loading'
  | 'loaded'
  | 'error';

export type AccelerationEngine = 'metal' | 'opencl' | 'cpu_fallback' | 'none';

export interface ModelMetadata {
  id: string;
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  quantization: string; // e.g. 'Q4_K_M'
  downloadUrl: string;
  isFineTuned: boolean;
  contextLength: number;
}

export interface ModelHardwareStats {
  acceleration: AccelerationEngine;
  memoryUsageMb: number;
  gpuLayersOffloaded: number;
  tokensPerSec: number;
}

export type LLMProviderType = 'on_device' | 'openai_compatible';

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export interface ModelState {
  currentModel: ModelMetadata;
  status: ModelStatus;
  downloadProgress: number; // 0 to 100
  provider: LLMProviderType;
  openAIConfig: OpenAICompatibleConfig;
  stats: ModelHardwareStats;
  errorMessage: string | null;
  setProvider: (provider: LLMProviderType) => void;
  updateOpenAIConfig: (config: Partial<OpenAICompatibleConfig>) => void;
  testOpenAIConnection: () => Promise<{ success: boolean; message: string; latencyMs?: number }>;
  downloadModel: () => Promise<void>;
  loadModel: () => Promise<void>;
  unloadModel: () => Promise<void>;
  autoInitOnDeviceModel: () => Promise<void>;
}

