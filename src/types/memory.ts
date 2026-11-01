export type MemoryCategory =
  | 'food_preference'
  | 'workout_preference'
  | 'injury_limitation'
  | 'personality_style';

export type MemoryOperation = 'ADD' | 'UPDATE' | 'DELETE' | 'NOOP';

export type MemorySource = 'agent' | 'extractor' | 'manual';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  /** Normalized subject key for deduplication & Mem0 UPDATE/DELETE reconciliation (e.g., "favorite_food", "favorite_skill", "shoulder_injury") */
  topic: string;
  /** Atomic fact stored for the athlete (e.g., "Favorite food: Grilled salmon & jasmine rice") */
  content: string;
  source: MemorySource;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryCandidate {
  category: MemoryCategory;
  content: string;
  topic?: string;
  operationHint?: 'ADD_OR_UPDATE' | 'DELETE';
  source?: MemorySource;
}

export interface MemoryReconciliationResult {
  operation: MemoryOperation;
  item?: MemoryItem;
  previousContent?: string;
  removedId?: string;
  summary: string;
}

export interface MemoryState {
  memories: MemoryItem[];
  remember: (candidate: MemoryCandidate) => MemoryReconciliationResult;
  forget: (idOrQuery: string) => MemoryReconciliationResult;
  getMemories: (category?: MemoryCategory) => MemoryItem[];
  searchMemories: (query: string, category?: MemoryCategory, limit?: number) => MemoryItem[];
  clearMemories: () => void;
}

