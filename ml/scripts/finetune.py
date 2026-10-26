#!/usr/bin/env python3
"""
ZeroCoach LoRA Fine-Tuning Script.
Trains a parameter-efficient Low-Rank Adaptation (LoRA) adapter for ZeroCoach
athletic intelligence using Apple Silicon MPS hardware acceleration.
Supports both Gemma 2 and compact causal LMs (SmolLM / Qwen / Gemma 2 2B).
Loss is computed strictly on the coach response tokens (prompt masked with -100).
"""

import argparse
import json
import math
import os
import time
from pathlib import Path
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    get_cosine_schedule_with_warmup
)
from peft import LoraConfig, get_peft_model, TaskType

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "ml" / "data"
OUTPUT_DIR = REPO_ROOT / "ml" / "output" / "zerocoach_lora_adapter"

class ZeroCoachDataset(Dataset):
    def __init__(self, jsonl_path: Path, tokenizer, max_length: int = 512):
        self.examples = []
        self.tokenizer = tokenizer
        self.max_length = max_length

        if not jsonl_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {jsonl_path}")

        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                data = json.loads(line)
                self.examples.append(data)

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        item = self.examples[idx]
        sys_prompt = item.get("system_prompt", "")
        user_prompt = item.get("user_prompt", "")
        response = item.get("response", "")

        # Format prompt and completion: ChatML for Qwen, Gemma format for Gemma
        model_name = getattr(self.tokenizer, "name_or_path", "").lower()
        if "gemma" in model_name:
            prompt_text = f"<start_of_turn>user\n{sys_prompt}\n\n{user_prompt}<end_of_turn>\n<start_of_turn>model\n"
            full_text = f"{prompt_text}{response}<end_of_turn>"
        else:
            # Native ChatML template for Qwen 3 / Qwen 2.5
            sys_block = f"<|im_start|>system\n{sys_prompt}<|im_end|>\n" if sys_prompt else ""
            prompt_text = f"{sys_block}<|im_start|>user\n{user_prompt}<|im_end|>\n<|im_start|>assistant\n"
            full_text = f"{prompt_text}{response}<|im_end|>\n"

        prompt_ids = self.tokenizer.encode(prompt_text, add_special_tokens=True)
        full_ids = self.tokenizer.encode(full_text, add_special_tokens=True)

        if len(full_ids) > self.max_length:
            full_ids = full_ids[:self.max_length]

        input_ids = torch.tensor(full_ids, dtype=torch.long)
        labels = input_ids.clone()

        # Mask prompt tokens so loss is only computed on the assistant response
        prompt_len = min(len(prompt_ids), len(labels))
        labels[:prompt_len] = -100

        return {
            "input_ids": input_ids,
            "labels": labels
        }

def collate_fn(batch, pad_token_id: int):
    max_len = max(len(b["input_ids"]) for b in batch)
    input_ids = []
    labels = []
    attention_mask = []

    for b in batch:
        cur_len = len(b["input_ids"])
        pad_len = max_len - cur_len

        # Pad input_ids with pad_token_id
        padded_inputs = torch.cat([b["input_ids"], torch.full((pad_len,), pad_token_id, dtype=torch.long)])
        # Pad labels with -100
        padded_labels = torch.cat([b["labels"], torch.full((pad_len,), -100, dtype=torch.long)])
        # Attention mask
        mask = torch.cat([torch.ones(cur_len, dtype=torch.long), torch.zeros(pad_len, dtype=torch.long)])

        input_ids.append(padded_inputs)
        labels.append(padded_labels)
        attention_mask.append(mask)

    return {
        "input_ids": torch.stack(input_ids),
        "labels": torch.stack(labels),
        "attention_mask": torch.stack(attention_mask)
    }

def main():
    parser = argparse.ArgumentParser(description="ZeroCoach Fine-Tuner")
    parser.add_argument("--model_id", type=str, default="Qwen/Qwen3-1.7B", help="Base model ID (e.g. Qwen/Qwen3-1.7B or Qwen/Qwen2.5-1.5B-Instruct)")
    parser.add_argument("--epochs", type=int, default=2, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=4, help="Batch size per step")
    parser.add_argument("--grad_accum", type=int, default=2, help="Gradient accumulation steps")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--max_length", type=int, default=1024, help="Maximum sequence length")
    parser.add_argument("--max_samples", type=int, default=None, help="Max train samples to train on (None for all)")
    args = parser.parse_args()

    print("=" * 60)
    print("⚡ ZEROCOACH MODEL FINE-TUNING PIPELINE")
    print(f"Base Model: {args.model_id}")
    print(f"Epochs: {args.epochs} | Batch Size: {args.batch_size} (Accum: {args.grad_accum}) | LR: {args.lr}")
    print("=" * 60)

    # Determine device
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print("Using Apple Silicon MPS (Metal Performance Shaders) GPU acceleration!")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        print("Using NVIDIA CUDA GPU acceleration!")
    else:
        device = torch.device("cpu")
        print("Using CPU device.")

    # Load Tokenizer
    print(f"Loading tokenizer: {args.model_id}...")
    tokenizer = AutoTokenizer.from_pretrained(args.model_id, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token or tokenizer.bos_token or "<pad>"
    pad_id = tokenizer.pad_token_id

    # Load Base Model
    print(f"Loading base model: {args.model_id}...", flush=True)
    torch_dtype = torch.bfloat16 if (device.type in ("cuda", "mps")) else torch.float32
    model = AutoModelForCausalLM.from_pretrained(
        args.model_id,
        torch_dtype=torch_dtype,
        trust_remote_code=True
    )
    if hasattr(model, "enable_input_require_grads"):
        model.enable_input_require_grads()
    if hasattr(model, "gradient_checkpointing_enable"):
        model.gradient_checkpointing_enable()

    # Configure LoRA
    print("Setting up PEFT LoRA adapter...", flush=True)
    # Find linear modules to adapt across all attention and MLP projections
    target_modules = ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=target_modules,
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM
    )

    model = get_peft_model(model, lora_config)
    model.to(device)

    trainable_params, all_params = model.get_nb_trainable_parameters()
    print(f"Trainable Parameters: {trainable_params:,} / {all_params:,} ({trainable_params / all_params * 100:.2f}%)", flush=True)

    # Load Datasets
    train_dataset = ZeroCoachDataset(DATA_DIR / "zerocoach_train.jsonl", tokenizer, max_length=args.max_length)
    val_dataset = ZeroCoachDataset(DATA_DIR / "zerocoach_val.jsonl", tokenizer, max_length=args.max_length)

    # Limit train dataset for speedy local verification if requested
    if args.max_samples and len(train_dataset) > args.max_samples:
        train_dataset.examples = train_dataset.examples[:args.max_samples]
    if len(val_dataset) > 50:
        val_dataset.examples = val_dataset.examples[:50]

    print(f"Training on {len(train_dataset)} samples, Validating on {len(val_dataset)} samples.")

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        collate_fn=lambda b: collate_fn(b, pad_id)
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        collate_fn=lambda b: collate_fn(b, pad_id)
    )

    # Optimizer & Scheduler
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    total_steps = (len(train_loader) // args.grad_accum) * args.epochs
    warmup_steps = max(5, int(total_steps * 0.1))
    scheduler = get_cosine_schedule_with_warmup(optimizer, num_warmup_steps=warmup_steps, num_training_steps=total_steps)

    # Training Loop
    print("\nStarting LoRA Fine-Tuning...")
    start_time = time.time()
    history = []

    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        step_count = 0
        epoch_start = time.time()

        optimizer.zero_grad()

        for step, batch in enumerate(train_loader):
            input_ids = batch["input_ids"].to(device)
            labels = batch["labels"].to(device)
            attention_mask = batch["attention_mask"].to(device)

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )

            loss = outputs.loss / args.grad_accum
            loss.backward()

            total_loss += loss.item() * args.grad_accum

            if (step + 1) % args.grad_accum == 0 or (step + 1) == len(train_loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                step_count += 1

                if step_count % 10 == 0:
                    avg_loss = total_loss / (step + 1)
                    current_lr = scheduler.get_last_lr()[0]
                    print(f"Epoch {epoch}/{args.epochs} | Step {step_count}/{len(train_loader)//args.grad_accum} | Train Loss: {avg_loss:.4f} | LR: {current_lr:.6f}", flush=True)

        epoch_train_loss = total_loss / len(train_loader)

        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for val_batch in val_loader:
                input_ids = val_batch["input_ids"].to(device)
                labels = val_batch["labels"].to(device)
                attention_mask = val_batch["attention_mask"].to(device)

                outputs = model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    labels=labels
                )
                val_loss += outputs.loss.item()

        epoch_val_loss = val_loss / len(val_loader)
        epoch_dur = time.time() - epoch_start
        print(f"--> Epoch {epoch} Complete in {epoch_dur:.1f}s | Train Loss: {epoch_train_loss:.4f} | Val Loss: {epoch_val_loss:.4f}")

        history.append({
            "epoch": epoch,
            "train_loss": round(epoch_train_loss, 4),
            "val_loss": round(epoch_val_loss, 4),
            "duration_seconds": round(epoch_dur, 1)
        })

    total_duration = time.time() - start_time
    print(f"\nTraining finished in {total_duration:.1f} seconds!")

    # Save LoRA Adapter
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Saving fine-tuned LoRA adapter to: {OUTPUT_DIR}...")
    model.save_pretrained(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))

    # Save Training Summary
    summary = {
        "model_name": "ZeroCoach-Athletic-Intelligence-v1",
        "base_model": args.model_id,
        "adapter_type": "LoRA (PEFT)",
        "target_architecture": "Qwen 3 (1.7B) / Llama compatible",
        "chat_template": "chatml",
        "trainable_parameters": trainable_params,
        "total_parameters": all_params,
        "epochs": args.epochs,
        "total_training_duration_seconds": round(total_duration, 1),
        "device": str(device),
        "history": history
    }

    with open(OUTPUT_DIR.parent / "training_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Adapter saved successfully! Ready for inference testing.")

if __name__ == "__main__":
    main()
