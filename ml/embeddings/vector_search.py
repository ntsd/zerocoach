#!/usr/bin/env python3
"""
ZeroCoach On-Device Semantic Vector Search Engine.
Performs cosine-similarity search against pre-computed RepDB exercise embeddings
and USDA whole food embeddings. Can run standalone or be embedded into local pipelines.
"""

import json
import sys
from pathlib import Path
import numpy as np
import torch
from sentence_transformers import SentenceTransformer

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
EMBEDDINGS_DIR = REPO_ROOT / "ml" / "embeddings"
EXERCISE_STORE = EMBEDDINGS_DIR / "exercise_embeddings.json"
FOOD_STORE = EMBEDDINGS_DIR / "food_embeddings.json"

class VectorSearchEngine:
    def __init__(self):
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device=self.device)
        
        with open(EXERCISE_STORE, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.ex_items = data["items"]
            self.ex_vectors = np.array(data["embeddings"], dtype=np.float32)

        with open(FOOD_STORE, "r", encoding="utf-8") as f:
            data = json.load(f)
            self.food_items = data["items"]
            self.food_vectors = np.array(data["embeddings"], dtype=np.float32)

    def search_exercises(self, query: str, top_k: int = 5):
        query_vec = self.model.encode([query], normalize_embeddings=True)[0]
        scores = np.dot(self.ex_vectors, query_vec)
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            item = dict(self.ex_items[idx])
            item["score"] = float(scores[idx])
            results.append(item)
        return results

    def search_foods(self, query: str, top_k: int = 5):
        query_vec = self.model.encode([query], normalize_embeddings=True)[0]
        scores = np.dot(self.food_vectors, query_vec)
        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            item = dict(self.food_items[idx])
            item["score"] = float(scores[idx])
            results.append(item)
        return results

def main():
    engine = VectorSearchEngine()
    test_queries = [
        ("exercise", "knee friendly quad compound exercise with dumbbells"),
        ("exercise", "upper body bodyweight pulling for lats and biceps"),
        ("food", "high protein low calorie post workout snack")
    ]

    print("\n=== ZEROCOACH VECTOR EMBEDDING RETRIEVAL TEST ===")
    for q_type, query in test_queries:
        print(f"\nQuery ({q_type.upper()}): '{query}'")
        if q_type == "exercise":
            results = engine.search_exercises(query, top_k=3)
            for i, r in enumerate(results, 1):
                print(f"  {i}. {r['name']} (Score: {r['score']:.4f}) | Bodypart: {r['body_part']} | Equip: {r['equipment']}")
        else:
            results = engine.search_foods(query, top_k=3)
            for i, r in enumerate(results, 1):
                print(f"  {i}. {r['name']} (Score: {r['score']:.4f}) | {r['protein']}g protein, {r['calories']} kcal")

if __name__ == "__main__":
    main()
