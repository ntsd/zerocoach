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
import { getDeviceMemoryInfo } from '@/services/device/deviceMemory';

export const QWEN3_VL_2B_MODEL: ModelMetadata = {
  id: 'qwen3-vl-2b-instruct-q4_k_m',
  name: 'Qwen 3 VL 2B Instruct (Vision Multimodal Default)',
  sizeBytes: 986047232,
  sizeFormatted: '986 MB',
  quantization: 'Q4_K_M',
  downloadUrl:
    'https://huggingface.co/bartowski/Qwen2-VL-2B-Instruct-GGUF/resolve/main/Qwen2-VL-2B-Instruct-Q4_K_M.gguf',
  fallbackDownloadUrl:
    'https://huggingface.co/lmstudio-community/Qwen2-VL-2B-Instruct-GGUF/resolve/main/Qwen2-VL-2B-Instruct-Q4_K_M.gguf',
  isFineTuned: false,
  contextLength: 2048,
};

export const ZEROCOACH_ATHLETIC_MODEL: ModelMetadata = {
  id: 'zerocoach-athletic-qwen3-1.7b-q4_k_m',
  name: 'ZeroCoach Athletic (Qwen 3 1.7B Fine-Tuned) (Experimental)',
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
  name: 'Qwen 3 1.7B Instruct (Base / No Finetune)',
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
  QWEN3_VL_2B_MODEL,
  ZEROCOACH_ATHLETIC_MODEL,
  QWEN_3_INSTRUCT_MODEL,
];

/**
 * Resolves the default model based on physical device RAM.
 * - Defaults to Qwen 3 VL 2B (~1.11 GB weights) for vision & multimodal execution with native Thai support.
 */
export function getDefaultModelByMemory(): ModelMetadata {
  return QWEN3_VL_2B_MODEL;
}

const DEFAULT_OPENAI_CONFIG: OpenAICompatibleConfig = {
  baseUrl: 'http://localhost:11434/v1',
  apiKey: '',
  modelName: 'zerocoach',
};

const initialDefaultModel = getDefaultModelByMemory();

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      currentModel: initialDefaultModel,
      availableModels: AVAILABLE_MODELS,
      userSelectedModelId: initialDefaultModel.id,
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
        const clean = key.trim();
        set({ geminiApiKey: clean });
        llmService.updateGeminiConfig({ apiKey: clean });
      },

      testOpenAIConnection: async () => {
        const config = get().openAIConfig;
        llmService.updateOpenAIConfig(config);
        return llmService.testOpenAIConnection();
      },

      testGeminiConnection: async () => {
        const key = get().geminiApiKey;
        llmService.updateGeminiConfig({ apiKey: key });
        return llmService.testGeminiConnection();
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
          const tempPartFile = new File(Paths.document, `${model.id}.gguf.part`);
          if (tempPartFile.exists) {
            tempPartFile.delete();
          }

          console.log(`[useModelStore] Downloading ${model.name} to temporary file: ${tempPartFile.uri}`);

          const downloadWithUrl = async (url: string) => {
            return await File.downloadFileAsync(url, tempPartFile, {
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

          // Verify downloaded file integrity before moving to final destination
          const minExpectedBytes = Math.round(model.sizeBytes * 0.85);
          if (tempPartFile.exists && tempPartFile.size >= minExpectedBytes) {
            if (destinationFile.exists) {
              destinationFile.delete();
            }
            await tempPartFile.move(destinationFile);
            console.log(`[useModelStore] Download verified (${destinationFile.size} bytes)! Auto-loading ${model.name}...`);
            set({ status: 'ready', downloadProgress: 100 });
            await get().loadModel();
          } else {
            if (tempPartFile.exists) {
              tempPartFile.delete();
            }
            throw new Error(`Model download was incomplete (${tempPartFile.size || 0} / ${model.sizeBytes} bytes).`);
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
          const minExpectedBytes = Math.round(model.sizeBytes * 0.85);
          if (!destinationFile.exists || destinationFile.size < minExpectedBytes) {
            if (destinationFile.exists) {
              console.warn(`[useModelStore] Deleting incomplete model file (${destinationFile.size} bytes)...`);
              destinationFile.delete();
            }
            throw new Error(`${model.name} weights not downloaded or incomplete. Please tap "DOWNLOAD MODEL" first.`);
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

          const minExpectedBytes = Math.round(state.currentModel.sizeBytes * 0.85);
          if (destinationFile.exists && destinationFile.size < minExpectedBytes) {
            console.warn(`[useModelStore] Found incomplete file on disk (${destinationFile.size} bytes). Deleting...`);
            destinationFile.delete();
          }

          if (destinationFile.exists && destinationFile.size >= minExpectedBytes) {
            console.log(`[useModelStore] ${state.currentModel.name} file verified on disk (${destinationFile.size} bytes). Automatically loading into RAM...`);
            await get().loadModel();
          } else {
            console.log(`[useModelStore] ${state.currentModel.name} not on disk or was corrupt. Automatically starting download & load...`);
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

          // Default to Qwen 3 VL 2B Instruct. Automatically migrate any legacy Gemma or older model ID.
          const defaultModel = getDefaultModelByMemory();
          if (
            !hydratedState.userSelectedModelId ||
            hydratedState.currentModel?.id?.includes('gemma') ||
            hydratedState.currentModel?.id === 'zerocoach-athletic-q4_0'
          ) {
            updates.currentModel = defaultModel;
            updates.userSelectedModelId = defaultModel.id;
          } else {
            const matched = AVAILABLE_MODELS.find((m) => m.id === hydratedState.currentModel?.id);
            updates.currentModel = matched || defaultModel;
            updates.userSelectedModelId = updates.currentModel.id;
          }

          useModelStore.setState(updates);

          const finalState = useModelStore.getState();
          llmService.setProvider(finalState.provider);
          llmService.updateOpenAIConfig(finalState.openAIConfig);
          if (finalState.geminiApiKey) {
            llmService.updateGeminiConfig({ apiKey: finalState.geminiApiKey });
          }

          // Clean up legacy Gemma 4 E2B weights (3.11 GB) from disk to reclaim mobile storage
          try {
            if (Paths.document) {
              const legacyGemma = new File(Paths.document, 'gemma-4-e2b-it-q4_k_m.gguf');
              if (legacyGemma.exists) {
                console.log('[useModelStore] Deleting legacy Gemma weights (3.11 GB) to reclaim device storage...');
                legacyGemma.delete();
              }
              // Also delete incomplete/corrupted Qwen weights (< 800 MB) left from interrupted downloads
              const qwenFile = new File(Paths.document, `${QWEN3_VL_2B_MODEL.id}.gguf`);
              if (qwenFile.exists && qwenFile.size < 800000000) {
                console.log(`[useModelStore] Deleting incomplete Qwen file (${qwenFile.size} bytes) to allow clean re-download...`);
                qwenFile.delete();
              }
            }
          } catch (e) {
            console.warn('[useModelStore] Failed to clean up legacy weights:', e);
          }

          // Automatically ensure on-device model is on disk and loaded into RAM on native devices
          setTimeout(() => {
            useModelStore.getState().autoInitOnDeviceModel();
          }, 400);
        }
      },
    }
  )
);
