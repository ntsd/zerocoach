#!/usr/bin/env python3
"""
ZeroCoach Web Distribution & Model Packaging Script.
Packages the on-device quantized GGUF models into /web/public/models/
for public download on zerocoach.tech. Datasets and embeddings remain in /ml.
"""

import hashlib
import json
import os
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
OUTPUT_DIR = ML_DIR / "output"
GGUF_DIR = OUTPUT_DIR / "zerocoach_gguf"

WEB_MODELS_DIR = REPO_ROOT / "web" / "public" / "models"
WEB_MODELS_DIR.mkdir(parents=True, exist_ok=True)

def compute_sha256(filepath: Path) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def main():
    print("=" * 60)
    print("📦 EXPORTING ZEROCOACH GGUF MODELS TO /web/public/models/")
    print("=" * 60)

    # Clean existing non-GGUF files in web/public/models
    for item in WEB_MODELS_DIR.iterdir():
        if item.is_file() and not item.name.endswith(".gguf"):
            item.unlink()
            print(f"Removed non-GGUF file: {item.name}")
        elif item.is_dir():
            shutil.rmtree(item)
            print(f"Removed directory: {item.name}")

    files_manifest = []

    # Copy On-Device Quantized GGUF Models only
    if GGUF_DIR.exists():
        for gguf_file in sorted(GGUF_DIR.glob("*.gguf")):
            dst = WEB_MODELS_DIR / gguf_file.name
            shutil.copy2(gguf_file, dst)
            size_bytes = dst.stat().st_size
            size_mb = round(size_bytes / (1024 * 1024), 2)
            files_manifest.append({
                "filename": gguf_file.name,
                "url": f"/models/{gguf_file.name}",
                "description": f"ZeroCoach On-Device GGUF Model: {gguf_file.name}",
                "size_bytes": size_bytes,
                "size_mb": size_mb,
                "sha256": compute_sha256(dst)
            })
            print(f"✓ Staged GGUF Model: {gguf_file.name} ({size_mb} MB)")

    print(f"\n✓ Web public models directory updated with GGUF binaries only.")

if __name__ == "__main__":
    main()
