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
} from '@/services/memory/mem0Engine';

export const useMemoryStore = create<MemoryState>()(
  persist<MemoryState>(
    (set, get) => ({
      memories: [],

      remember: (candidate: MemoryCandidate): MemoryReconciliationResult => {
        const current = get().memories;
        const { memories: updated, result } = reconcileMemory(current, candidate);
        if (result.operation !== 'NOOP') {
          set({ memories: updated });
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

