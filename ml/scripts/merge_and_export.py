#!/usr/bin/env python3
"""
ZeroCoach Model Merging & GGUF Export Script.
Merges trained LoRA adapter weights back into the base model architecture,
exports a standalone Hugging Face model directory, generates Ollama Modelfile,
and produces the llama.cpp GGUF conversion workflow for on-device mobile execution.
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
OUTPUT_DIR = ML_DIR / "output"
ADAPTER_DIR = OUTPUT_DIR / "zerocoach_lora_adapter"
MERGED_DIR = OUTPUT_DIR / "zerocoach_merged"
GGUF_DIR = OUTPUT_DIR / "zerocoach_gguf"

def main():
    parser = argparse.ArgumentParser(description="Merge LoRA weights and prepare GGUF export for ZeroCoach.")
    parser.add_argument(
        "--base_model",
        type=str,
        default="HuggingFaceTB/SmolLM-135M-Instruct",
        help="Base model ID used during fine-tuning (e.g. HuggingFaceTB/SmolLM-135M-Instruct or google/gemma-2-2b-it)"
    )
    parser.add_argument(
        "--adapter_dir",
        type=str,
        default=str(ADAPTER_DIR),
        help="Path to saved LoRA adapter directory"
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default=str(MERGED_DIR),
        help="Directory where the merged model will be saved"
    )
    args = parser.parse_args()

    adapter_path = Path(args.adapter_dir)
    merged_path = Path(args.output_dir)
    gguf_path = GGUF_DIR

    print("=" * 65)
    print("🧬 ZEROCOACH MODEL MERGING & EXPORT PIPELINE")
    print("=" * 65)
    print(f"Base Model:    {args.base_model}")
    print(f"LoRA Adapter:  {adapter_path}")
    print(f"Merged Output: {merged_path}")
    print("=" * 65)

    if not adapter_path.exists():
        print(f"Error: LoRA adapter directory not found: {adapter_path}")
        sys.exit(1)

    # 1. Load Base Model and Tokenizer
    print("\n1. Loading Base Model...")
    device_map = "cpu"
    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=torch.float32,
        device_map=device_map,
        trust_remote_code=True
    )
    tokenizer = AutoTokenizer.from_pretrained(str(adapter_path), trust_remote_code=True)

    # 2. Load LoRA Adapter and Merge
    print("2. Loading LoRA Adapter and merging weights into base model...")
    lora_model = PeftModel.from_pretrained(base_model, str(adapter_path))
    merged_model = lora_model.merge_and_unload()
    print("   ✓ Weights merged successfully!")

    # 3. Save Merged Model
    merged_path.mkdir(parents=True, exist_ok=True)
    print(f"3. Saving merged standalone model to: {merged_path}...")
    merged_model.save_pretrained(str(merged_path), safe_serialization=True)
    tokenizer.save_pretrained(str(merged_path))
    print("   ✓ Merged HuggingFace weights & tokenizer saved.")

    # 4. Generate Ollama Modelfile
    print("4. Generating Ollama Modelfile for local LAN / desktop serving...")
    modelfile_content = f"""# ZeroCoach Athletic Intelligence Modelfile
FROM {merged_path.resolve()}

TEMPLATE \"\"\"<start_of_turn>user
{{{{ if .System }}}}{{{{ .System }}}}

{{{{ end }}}}{{{{ .Prompt }}}}<end_of_turn>
<start_of_turn>model
{{{{ .Response }}}}\"\"\"

SYSTEM \"\"\"You are ZeroCoach, an elite athletic coach operating with dual-mode intelligence: Strict compound mechanics vs. Comfortable sustainable longevity. You autoregulate training based on readiness score (RPE 6-7 deload for <60, progressive overload for >=80).\"\"\"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER stop "<start_of_turn>"
PARAMETER stop "<end_of_turn>"
PARAMETER stop "<eos>"
"""
    modelfile_path = merged_path / "Modelfile"
    with open(modelfile_path, "w", encoding="utf-8") as f:
        f.write(modelfile_content)
    print(f"   ✓ Modelfile created: {modelfile_path}")

    # 5. GGUF Conversion Instructions
    gguf_path.mkdir(parents=True, exist_ok=True)
    readme_content = f"""# ZeroCoach GGUF On-Device Conversion Guide

To run this fine-tuned model directly on mobile inside the ZeroCoach iOS / Android app via `llama.rn`:

### Option A: Direct llama.cpp conversion
```bash
# 1. Clone llama.cpp if not already installed
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# 2. Convert merged HuggingFace model to GGUF (FP16)
python3 convert_hf_to_gguf.py {merged_path.resolve()} --outfile {gguf_path.resolve()}/zerocoach-f16.gguf --outtype f16

# 3. Quantize to 4-bit medium (optimal mobile speed/quality ratio)
./llama-quantize {gguf_path.resolve()}/zerocoach-f16.gguf {gguf_path.resolve()}/zerocoach-q4_k_m.gguf Q4_K_M
```

### Option B: Run on Desktop / Local Network (Ollama)
```bash
# Register model in Ollama:
ollama create zerocoach -f {modelfile_path.resolve()}

# Run test query:
ollama run zerocoach "My readiness score is 45. What should my squat session look like?"
```
Then in the ZeroCoach mobile app:
1. Open **Settings / Model Manager**
2. Select **OpenAI-Compatible**
3. Base URL: `http://<YOUR_COMPUTER_IP>:11434/v1`
4. Model Name: `zerocoach`
"""
    with open(gguf_path / "README.md", "w", encoding="utf-8") as f:
        f.write(readme_content)

    print(f"   ✓ GGUF export instructions written to: {gguf_path / 'README.md'}")
    print("\n" + "=" * 65)
    print("🎉 MERGE & EXPORT COMPLETE!")
    print("=" * 65)

if __name__ == "__main__":
    main()
