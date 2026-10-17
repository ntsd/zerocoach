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
      geminiApiKey: '',
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

      setGeminiApiKey: (key: string) => {
        set({ geminiApiKey: key.trim() });
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
              'Local filesystem storage is not accessible in this environment. Native device required for local GGUF weights.'
            );
          }
          const destinationFile = new File(Paths.document, `${GEMMA_2_MODEL.id}.gguf`);
          console.log(`[useModelStore] Downloading Gemma 2 to: ${destinationFile.uri}`);

          const downloaded = await File.downloadFileAsync(
            GEMMA_2_MODEL.downloadUrl,
            destinationFile,
            {
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
                    Math.round((progress.bytesWritten / GEMMA_2_MODEL.sizeBytes) * 100)
                  );
                  set({ downloadProgress: pct });
                }
              },
            }
          );

          if (downloaded && (downloaded.exists || downloaded.uri)) {
            console.log('[useModelStore] Download complete! Auto-loading Gemma 2 into memory...');
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
        set({ status: 'loading', errorMessage: null });
        try {
          if (!Paths.document) {
            throw new Error('Paths.document not accessible');
          }
          const destinationFile = new File(Paths.document, `${GEMMA_2_MODEL.id}.gguf`);
          if (!destinationFile.exists) {
            throw new Error('Gemma 2 weights not downloaded yet. Please tap "DOWNLOAD MODEL" first.');
          }
          const nativePath = destinationFile.uri.replace(/^file:\/\//, '');
          console.log(`[useModelStore] Initializing llama.rn with: ${nativePath}`);
          const success = await llmService.initialize(nativePath);
          if (success) {
            console.log('[useModelStore] Gemma 2 loaded successfully into llama.rn memory!');
            set({ status: 'loaded', errorMessage: null });
          } else {
            set({
              status: 'ready',
              errorMessage: 'Native llama.rn failed to initialize Gemma 2 context.',
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

        // If native llama context is already initialized in this process memory
        if (llmService.isNativeReady()) {
          console.log('[useModelStore] Gemma 2 context is already active in RAM.');
          if (state.status !== 'loaded') {
            set({ status: 'loaded' });
          }
          return;
        }

        if (state.status === 'downloading' || state.status === 'loading') {
          return;
        }

        try {
          if (!Paths.document) return;
          const destinationFile = new File(Paths.document, `${GEMMA_2_MODEL.id}.gguf`);
          if (destinationFile.exists) {
            console.log('[useModelStore] Gemma 2 file exists on disk. Automatically loading into RAM...');
            await get().loadModel();
          } else {
            console.log('[useModelStore] Gemma 2 not on disk. Automatically starting download & load...');
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
        provider: state.provider,
        openAIConfig: state.openAIConfig,
        geminiApiKey: state.geminiApiKey,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if ((state.provider as string) === 'simulator') {
            state.provider = 'on_device';
          }
          llmService.setProvider(state.provider);
          llmService.updateOpenAIConfig(state.openAIConfig);

          // Reset transient in-memory status on fresh process launch
          state.status = 'unloaded';
          state.downloadProgress = 0;

          // Automatically ensure Gemma 2 is on disk and loaded into RAM on native devices
          setTimeout(() => {
            state.autoInitOnDeviceModel();
          }, 400);
        }
      },
    }
  )
);
