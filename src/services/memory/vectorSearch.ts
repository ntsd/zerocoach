import { MemoryItem } from '@/types/memory';

/**
 * Computes cosine similarity between two numeric dense vectors.
 * Returns a value between -1.0 and 1.0 (or 0 if dimensions differ / zero vector).
 */
export function cosineSimilarity(a: number[] | Float32Array, b: number[] | Float32Array): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA <= 0 || normB <= 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ranks a list of memories against a query embedding vector by cosine similarity.
 */
export function rankMemoriesByVector(
  queryEmbedding: number[] | Float32Array,
  memories: MemoryItem[],
  minSimilarity: number = 0.35
): Array<{ item: MemoryItem; similarity: number }> {
  if (!queryEmbedding || queryEmbedding.length === 0 || !memories || memories.length === 0) {
    return [];
  }

  const scored: Array<{ item: MemoryItem; similarity: number }> = [];

  for (const item of memories) {
    if (!item.embedding || item.embedding.length === 0) continue;
    const sim = cosineSimilarity(queryEmbedding, item.embedding);
    if (sim >= minSimilarity) {
      scored.push({ item, similarity: sim });
    }
  }

  return scored.sort((a, b) => b.similarity - a.similarity);
}

