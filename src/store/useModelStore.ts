import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModelMetadata, ModelState, ModelStatus } from '@/types/model';
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

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      currentModel: GEMMA_2_MODEL,
      status: 'ready',
      downloadProgress: 100,
      useMockFallback: true, // Default to true for zero-latency instant dev/demo
      errorMessage: null,
      stats: {
        acceleration: 'opencl',
        memoryUsageMb: 890,
        gpuLayersOffloaded: 1,
        tokensPerSec: 38.5,
      },

      setUseMockFallback: (val: boolean) => {
        set({ useMockFallback: val });
        llmService.setPreferNative(!val);
      },

      downloadModel: async () => {
        set({ status: 'downloading', downloadProgress: 0 });
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((res) => setTimeout(res, 250));
          set({ downloadProgress: i });
        }
        set({ status: 'ready', downloadProgress: 100 });
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
    }
  )
);
