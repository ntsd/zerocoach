import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MemoryCategory,
  MemoryCandidate,
  MemoryItem,
  MemoryReconciliationResult,
  MemoryState,
} from '@/types/memory';
import {
  reconcileMemory,
  deleteMemoryByQuery,
  retrieveRelevantMemories,
  normalizeMemoryCategory,
} from '@/services/memory/memoryEngine';
import { embeddingService } from '@/services/device/embeddingService';

export const useMemoryStore = create<MemoryState>()(
  persist<MemoryState>(
    (set, get) => ({
      memories: [],

      remember: (candidate: MemoryCandidate): MemoryReconciliationResult => {
        const current = get().memories;
        const { memories: updated, result } = reconcileMemory(current, candidate);
        if (result.operation !== 'NOOP') {
          set({ memories: updated });

          // Asynchronously compute and attach dense vector embedding
          if (result.item && !result.item.embedding) {
            const targetId = result.item.id;
            const contentToEmbed = result.item.content;
            embeddingService
              .getEmbedding(contentToEmbed)
              .then((vec) => {
                if (vec && vec.length > 0) {
                  const latest = get().memories;
                  const idx = latest.findIndex((m) => m.id === targetId);
                  if (idx !== -1) {
                    const next = [...latest];
                    next[idx] = { ...next[idx], embedding: vec };
                    set({ memories: next });
                    console.log(`[useMemoryStore] Attached dense embedding (${vec.length}-d) to memory "${contentToEmbed}"`);
                  }
                }
              })
              .catch((err) => console.warn('[useMemoryStore] Async embedding error:', err));
          }
        }
        return result;
      },

      forget: (idOrQuery: string): MemoryReconciliationResult => {
        const current = get().memories;
        const { memories: updated, result } = deleteMemoryByQuery(current, idOrQuery);
        if (result.operation === 'DELETE') {
          set({ memories: updated });
        }
        return result;
      },

      getMemories: (category?: MemoryCategory): MemoryItem[] => {
        const all = get().memories;
        if (!category) return all;
        const norm = normalizeMemoryCategory(category);
        return all.filter((m) => m.category === norm);
      },

      searchMemories: (query: string, category?: MemoryCategory, limit = 10): MemoryItem[] => {
        const base = category ? get().getMemories(category) : get().memories;
        return retrieveRelevantMemories(base, query, limit);
      },

      searchMemoriesVector: async (
        query: string,
        category?: MemoryCategory,
        limit = 10
      ): Promise<MemoryItem[]> => {
        const queryVec = await embeddingService.getEmbedding(query);
        const base = category ? get().getMemories(category) : get().memories;
        return retrieveRelevantMemories(base, query, limit, queryVec || undefined);
      },

      clearMemories: () => {
        set({ memories: [] });
      },
    }),
    {
      name: 'zerocoach-memory-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

