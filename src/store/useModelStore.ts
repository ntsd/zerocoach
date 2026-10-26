import { Platform } from 'react-native';
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

export const GEMMA_2_MODEL: ModelMetadata = {
  id: 'gemma-2-2b-it-q4_k_m',
  name: 'Gemma 2 (2B Instruct Baseline)',
  sizeBytes: 1640000000,
  sizeFormatted: '1.64 GB',
  quantization: 'Q4_K_M',
  downloadUrl:
    'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
  isFineTuned: false,
  contextLength: 2048,
};

export const ZEROCOACH_ATHLETIC_MODEL: ModelMetadata = {
  id: 'zerocoach-athletic-qwen3-1.7b-q4_k_m',
  name: 'ZeroCoach Athletic (Qwen 3 1.7B Fine-Tuned)',
  sizeBytes: 1050000000,
  sizeFormatted: '1.05 GB',
  quantization: 'Q4_K_M',
  downloadUrl:
    'https://huggingface.co/ntsd/zerocoach-athletic-qwen3-1.7b-GGUF/resolve/main/zerocoach-athletic-qwen3-1.7b-q4_k_m.gguf',
  fallbackDownloadUrl:
    'https://zerocoach.tech/models/zerocoach-athletic-qwen3-1.7b-q4_k_m.gguf',
  isFineTuned: true,
  contextLength: 2048,
};

export const QWEN_3_INSTRUCT_MODEL: ModelMetadata = {
  id: 'qwen3-1.7b-instruct-q4_k_m',
  name: 'Qwen 3 1.7B Instruct (General + Athletic)',
  sizeBytes: 1217000000,
  sizeFormatted: '1.21 GB',
  quantization: 'Q4_K_M',
  downloadUrl:
    'https://huggingface.co/ntsd/zerocoach-athletic-qwen3-1.7b-GGUF/resolve/main/qwen3-1.7b-instruct-q4_k_m.gguf',
  fallbackDownloadUrl:
    'https://zerocoach.tech/models/qwen3-1.7b-instruct-q4_k_m.gguf',
  isFineTuned: false,
  contextLength: 4096,
};

export const AVAILABLE_MODELS: ModelMetadata[] = [
  ZEROCOACH_ATHLETIC_MODEL,
  QWEN_3_INSTRUCT_MODEL,
  GEMMA_2_MODEL,
];

const DEFAULT_OPENAI_CONFIG: OpenAICompatibleConfig = {
  baseUrl: 'http://localhost:11434/v1',
  apiKey: '',
  modelName: 'zerocoach',
};

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      currentModel: ZEROCOACH_ATHLETIC_MODEL,
      availableModels: AVAILABLE_MODELS,
      userSelectedModelId: ZEROCOACH_ATHLETIC_MODEL.id,
      status: 'unloaded',
      downloadProgress: 0,
      provider: 'on_device',
      openAIConfig: DEFAULT_OPENAI_CONFIG,
      geminiApiKey: '',
      errorMessage: null,
      stats: {
        acceleration: 'none',
        memoryUsageMb: 0,
        gpuLayersOffloaded: 0,
        tokensPerSec: 0,
      },

      selectModel: async (model: ModelMetadata) => {
        if (get().currentModel.id === model.id && get().status === 'loaded') return;
        await get().unloadModel();
        set({
          currentModel: model,
          userSelectedModelId: model.id,
          status: 'unloaded',
          downloadProgress: 0,
          errorMessage: null,
        });

        if (Platform.OS !== 'web' && Paths.document) {
          const destinationFile = new File(Paths.document, `${model.id}.gguf`);
          if (destinationFile.exists) {
            set({ status: 'ready' });
            await get().loadModel();
          }
        }
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

      setGeminiApiKey: (key: string) => {
        set({ geminiApiKey: key.trim() });
      },

      testOpenAIConnection: async () => {
        const config = get().openAIConfig;
        llmService.updateOpenAIConfig(config);
        return llmService.testOpenAIConnection();
      },

      downloadModel: async () => {
        const model = get().currentModel;
        set({ status: 'downloading', downloadProgress: 0, errorMessage: null });
        try {
          if (!Paths.document) {
            throw new Error(
              'Local filesystem storage is not accessible in this environment. Native device required for local GGUF weights.'
            );
          }
          const destinationFile = new File(Paths.document, `${model.id}.gguf`);
          console.log(`[useModelStore] Downloading ${model.name} to: ${destinationFile.uri}`);

          const downloadWithUrl = async (url: string) => {
            return await File.downloadFileAsync(url, destinationFile, {
              idempotent: true,
              onProgress: (progress) => {
                if (progress.totalBytes > 0) {
                  const pct = Math.min(
                    99,
                    Math.round((progress.bytesWritten / progress.totalBytes) * 100)
                  );
                  set({ downloadProgress: pct });
                } else if (progress.bytesWritten > 0) {
                  const pct = Math.min(
                    99,
                    Math.round((progress.bytesWritten / model.sizeBytes) * 100)
                  );
                  set({ downloadProgress: pct });
                }
              },
            });
          };

          let downloaded: any = null;
          try {
            downloaded = await downloadWithUrl(model.downloadUrl);
          } catch (primaryErr: any) {
            if (model.fallbackDownloadUrl) {
              console.warn(
                `[useModelStore] Primary download failed (${primaryErr?.message || primaryErr}), trying fallback: ${model.fallbackDownloadUrl}`
              );
              downloaded = await downloadWithUrl(model.fallbackDownloadUrl);
            } else {
              throw primaryErr;
            }
          }

          if (downloaded && (downloaded.exists || downloaded.uri)) {
            console.log(`[useModelStore] Download complete! Auto-loading ${model.name} into memory...`);
            set({ status: 'ready', downloadProgress: 100 });
            await get().loadModel();
          } else {
            throw new Error('Model download did not return a valid file.');
          }
        } catch (err: any) {
          console.error('[useModelStore] Download error:', err);
          set({ status: 'error', errorMessage: err?.message || 'Download failed' });
        }
      },

      loadModel: async () => {
        const model = get().currentModel;
        set({ status: 'loading', errorMessage: null });
        try {
          if (!Paths.document) {
            throw new Error('Paths.document not accessible');
          }
          const destinationFile = new File(Paths.document, `${model.id}.gguf`);
          if (!destinationFile.exists) {
            throw new Error(`${model.name} weights not downloaded yet. Please tap "DOWNLOAD MODEL" first.`);
          }
          const nativePath = destinationFile.uri.replace(/^file:\/\//, '');
          console.log(`[useModelStore] Initializing llama.rn with: ${nativePath}`);
          const success = await llmService.initialize(nativePath);
          if (success) {
            console.log(`[useModelStore] ${model.name} loaded successfully into llama.rn memory!`);
            set({ status: 'loaded', errorMessage: null });
          } else {
            set({
              status: 'ready',
              errorMessage: `Native llama.rn failed to initialize ${model.name} context.`,
            });
          }
        } catch (err: any) {
          console.error('[useModelStore] Failed to load model:', err);
          set({ status: 'error', errorMessage: err?.message || 'Failed to load model' });
        }
      },

      unloadModel: async () => {
        await llmService.unload();
        set({ status: 'ready' });
      },

      autoInitOnDeviceModel: async () => {
        if (Platform.OS === 'web') return;
        const state = get();
        if (state.provider !== 'on_device') return;

        try {
          if (!Paths.document) return;
          const destinationFile = new File(Paths.document, `${state.currentModel.id}.gguf`);
          const nativePath = destinationFile.uri.replace(/^file:\/\//, '');

          // If native llama context is already initialized with THIS model in this process memory
          if (llmService.isNativeReady() && llmService.getLoadedModelPath() === nativePath) {
            console.log(`[useModelStore] ${state.currentModel.name} context is already active in RAM.`);
            if (state.status !== 'loaded') {
              set({ status: 'loaded' });
            }
            return;
          }

          if (state.status === 'downloading' || state.status === 'loading') {
            return;
          }

          if (destinationFile.exists) {
            console.log(`[useModelStore] ${state.currentModel.name} file exists on disk. Automatically loading into RAM...`);
            await get().loadModel();
          } else {
            console.log(`[useModelStore] ${state.currentModel.name} not on disk. Automatically starting download & load...`);
            await get().downloadModel();
          }
        } catch (err) {
          console.warn('[useModelStore] autoInitOnDeviceModel error:', err);
        }
      },
    }),
    {
      name: 'zerocoach-model-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentModel: state.currentModel,
        userSelectedModelId: state.userSelectedModelId,
        provider: state.provider,
        openAIConfig: state.openAIConfig,
        geminiApiKey: state.geminiApiKey,
      }),
      onRehydrateStorage: () => (hydratedState) => {
        if (hydratedState) {
          const updates: Partial<ModelState> = {
            status: 'unloaded',
            downloadProgress: 0,
          };

          if ((hydratedState.provider as string) === 'simulator') {
            updates.provider = 'on_device';
          }

          // Default on-device model to ZeroCoach Athletic (Qwen 3 1.7B Fine-Tuned)
          if (
            !hydratedState.userSelectedModelId ||
            hydratedState.currentModel?.id === 'zerocoach-athletic-q4_0' ||
            hydratedState.currentModel?.id === 'zerocoach-athletic-qwen3-1.7b-q4_k_m'
          ) {
            updates.currentModel = ZEROCOACH_ATHLETIC_MODEL;
            updates.userSelectedModelId = ZEROCOACH_ATHLETIC_MODEL.id;
          } else {
            const matched = AVAILABLE_MODELS.find((m) => m.id === hydratedState.currentModel?.id);
            updates.currentModel = matched || ZEROCOACH_ATHLETIC_MODEL;
          }

          useModelStore.setState(updates);

          const finalState = useModelStore.getState();
          llmService.setProvider(finalState.provider);
          llmService.updateOpenAIConfig(finalState.openAIConfig);

          // Automatically ensure on-device model is on disk and loaded into RAM on native devices
          setTimeout(() => {
            useModelStore.getState().autoInitOnDeviceModel();
          }, 400);
        }
      },
    }
  )
);
