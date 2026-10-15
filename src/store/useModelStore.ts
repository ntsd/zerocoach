import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import {
  LLMProviderType,
  ModelMetadata,
  ModelState,
  OpenAICompatibleConfig,
} from '@/types/model';
import { llmService } from '@/services/llm/llmService';

const GEMMA_2_MODEL: ModelMetadata = {
  id: 'gemma-2-2b-it-q4_k_m',
  name: 'Gemma 2 (2B Instruct)',
  sizeBytes: 1640000000,
  sizeFormatted: '1.64 GB',
  quantization: 'Q4_K_M',
  downloadUrl:
    'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
  isFineTuned: true,
  contextLength: 2048,
};

const DEFAULT_OPENAI_CONFIG: OpenAICompatibleConfig = {
  baseUrl: 'http://localhost:11434/v1',
  apiKey: '',
  modelName: 'llama3.2',
};

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      currentModel: GEMMA_2_MODEL,
      status: 'unloaded',
      downloadProgress: 0,
      provider: 'on_device',
      openAIConfig: DEFAULT_OPENAI_CONFIG,
      errorMessage: null,
      stats: {
        acceleration: 'none',
        memoryUsageMb: 0,
        gpuLayersOffloaded: 0,
        tokensPerSec: 0,
      },

      setProvider: (provider: LLMProviderType) => {
        set({ provider });
        llmService.setProvider(provider);
      },

      updateOpenAIConfig: (updates: Partial<OpenAICompatibleConfig>) => {
        set((state) => {
          const next = { ...state.openAIConfig, ...updates };
          llmService.updateOpenAIConfig(next);
          return { openAIConfig: next };
        });
      },

      testOpenAIConnection: async () => {
        const config = get().openAIConfig;
        llmService.updateOpenAIConfig(config);
        return llmService.testOpenAIConnection();
      },

      downloadModel: async () => {
        set({ status: 'downloading', downloadProgress: 0, errorMessage: null });
        try {
          if (!Paths.document) {
            throw new Error(
              'Local filesystem storage is not accessible in this browser/environment. Native device required for local GGUF weights.'
            );
          }
          const destinationFile = new File(Paths.document, `${GEMMA_2_MODEL.id}.gguf`);
          const downloaded = await File.downloadFileAsync(
            GEMMA_2_MODEL.downloadUrl,
            destinationFile,
            { idempotent: true }
          );
          if (downloaded && downloaded.uri) {
            set({ status: 'ready', downloadProgress: 100 });
          } else {
            throw new Error('Model download did not complete successfully.');
          }
        } catch (err: any) {
          set({ status: 'error', errorMessage: err?.message || 'Download failed' });
        }
      },

      loadModel: async () => {
        set({ status: 'loading' });
        try {
          const success = await llmService.initialize();
          if (success) {
            set({ status: 'loaded', errorMessage: null });
          } else {
            set({
              status: 'ready',
              errorMessage: 'Native initialization fell back to dev simulator engine.',
            });
          }
        } catch (err: any) {
          set({ status: 'error', errorMessage: err?.message || 'Failed to load model' });
        }
      },

      unloadModel: async () => {
        await llmService.unload();
        set({ status: 'ready' });
      },
    }),
    {
      name: 'zerocoach-model-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          llmService.setProvider(state.provider);
          llmService.updateOpenAIConfig(state.openAIConfig);
        }
      },
    }
  )
);
