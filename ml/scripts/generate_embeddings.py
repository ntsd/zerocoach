#!/usr/bin/env python3
"""
ZeroCoach Exercise & Nutrition Vector Embedding Generator.
Pre-computes high-density normalized embeddings for all 643 RepDB movements
and USDA whole food items using a lightweight mobile-friendly encoder.
Enables instant (<1ms) on-device semantic search, movement swapping, and smart meal lookup.
"""

import json
import os
from pathlib import Path
import numpy as np
import torch
from sentence_transformers import SentenceTransformer

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
EXERCISES_PATH = REPO_ROOT / "src" / "data" / "exercises.json"
FOODS_PATH = REPO_ROOT / "src" / "data" / "usdaWholeFoods.json"
OUTPUT_DIR = REPO_ROOT / "ml" / "embeddings"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def main():
    print(f"Loading embedding model: {MODEL_NAME}...")
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using compute device: {device}")
    model = SentenceTransformer(MODEL_NAME, device=device)

    # 1. Embed Exercises
    print("Reading RepDB exercises...")
    with open(EXERCISES_PATH, "r", encoding="utf-8") as f:
        exercises_data = json.load(f)
        exercises = exercises_data.get("exercises", [])

    print(f"Loaded {len(exercises)} exercises. Generating semantic descriptions...")
    exercise_texts = []
    exercise_metadata = []

    for ex in exercises:
        name = ex.get("name_en", "")
        body_part = ex.get("body_part", "")
        category = ex.get("category", "")
        equipment = ex.get("equipment", "")
        primary_muscles = ", ".join(ex.get("primary_muscles", []))
        secondary_muscles = ", ".join(ex.get("secondary_muscles", []))
        instructions = " ".join(ex.get("instructions_en", [])[:2])

        semantic_doc = f"Exercise: {name}. Body part: {body_part}. Category: {category}. Equipment: {equipment}. Primary muscles: {primary_muscles}. Secondary muscles: {secondary_muscles}. Instructions: {instructions}"
        exercise_texts.append(semantic_doc)

        exercise_metadata.append({
            "id": ex.get("id", ""),
            "name": name,
            "category": category,
            "body_part": body_part,
            "equipment": equipment,
            "primary_muscles": ex.get("primary_muscles", []),
            "secondary_muscles": ex.get("secondary_muscles", []),
            "difficulty": ex.get("difficulty", "intermediate")
        })

    print(f"Encoding {len(exercise_texts)} exercises into 384-dimensional dense vectors...")
    ex_embeddings = model.encode(exercise_texts, batch_size=64, show_progress_bar=True, normalize_embeddings=True)

    # 2. Embed USDA Whole Foods
    print("Reading USDA whole foods...")
    with open(FOODS_PATH, "r", encoding="utf-8") as f:
        foods = json.load(f)

    food_texts = []
    food_metadata = []

    for food in foods:
        name = food.get("name", "")
        cat = food.get("category", "")
        nutrients = food.get("nutrientsPer100g", {})
        cal = nutrients.get("calories", 0)
        p = nutrients.get("proteinGrams", 0)
        c = nutrients.get("carbsGrams", 0)
        fat = nutrients.get("fatGrams", 0)

        semantic_doc = f"Food item: {name}. Category: {cat}. Energy: {cal} kcal per 100g. Protein: {p}g. Carbs: {c}g. Fat: {fat}g."
        food_texts.append(semantic_doc)

        food_metadata.append({
            "id": food.get("id", ""),
            "name": name,
            "category": cat,
            "calories": cal,
            "protein": p,
            "carbs": c,
            "fat": fat
        })

    print(f"Encoding {len(food_texts)} foods into dense vectors...")
    food_embeddings = model.encode(food_texts, batch_size=64, show_progress_bar=True, normalize_embeddings=True)

    # Save to disk
    print("Saving vector store and metadata...")
    exercise_store = {
        "model": MODEL_NAME,
        "dimension": int(ex_embeddings.shape[1]),
        "count": len(exercises),
        "items": exercise_metadata,
        "embeddings": ex_embeddings.tolist()
    }

    with open(OUTPUT_DIR / "exercise_embeddings.json", "w", encoding="utf-8") as f:
        json.dump(exercise_store, f)

    food_store = {
        "model": MODEL_NAME,
        "dimension": int(food_embeddings.shape[1]),
        "count": len(foods),
        "items": food_metadata,
        "embeddings": food_embeddings.tolist()
    }

    with open(OUTPUT_DIR / "food_embeddings.json", "w", encoding="utf-8") as f:
        json.dump(food_store, f)

    # Also save as safetensors for direct tensor inference
    from safetensors.torch import save_file
    save_file({
        "exercise_embeddings": torch.from_numpy(ex_embeddings).float(),
        "food_embeddings": torch.from_numpy(food_embeddings).float()
    }, OUTPUT_DIR / "zerocoach_embeddings.safetensors")

    print(f"Embeddings generated successfully!")
    print(f"Exercise index: {OUTPUT_DIR / 'exercise_embeddings.json'}")
    print(f"Food index: {OUTPUT_DIR / 'food_embeddings.json'}")
    print(f"Binary safetensors: {OUTPUT_DIR / 'zerocoach_embeddings.safetensors'}")

if __name__ == "__main__":
    main()
