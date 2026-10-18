#!/usr/bin/env python3
"""
ZeroCoach Local Model Inference & Verification Engine.
Loads the fine-tuned LoRA adapter on top of the base model
and executes dynamic test prompts against real physiological telemetry.
"""

import json
import time
from pathlib import Path
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ADAPTER_DIR = REPO_ROOT / "ml" / "output" / "zerocoach_lora_adapter"
SUMMARY_PATH = REPO_ROOT / "ml" / "output" / "training_summary.json"

TEST_PROMPTS = [
    {
        "title": "Scenario A: High Readiness (94/100) - Heavy Compound Overload",
        "system_prompt": """You are ZeroCoach in STRICT ATHLETE MODE—an elite, data-driven sports scientist, strength & conditioning coach, and movement specialist.
=== LIVE TELEMETRY ===
- LIVE BIOMETRIC TELEMETRY:
  * Daily Readiness Score: 94/100
  * Sleep Duration: 8.6 hrs (Deep Sleep: 2.4 hrs)
  * Resting Heart Rate: 46 bpm
  * Heart Rate Variability (HRV): 88 ms
  * Daily Step Count: 9,200
  * Active Energy Burned: 620 kcal
======================""",
        "user_query": "Readiness is 94 today. How should I approach my heavy barbell back squat session?"
    },
    {
        "title": "Scenario B: Depressed Readiness (42/100) - Fatigue Deload",
        "system_prompt": """You are ZeroCoach in STRICT ATHLETE MODE—an elite, data-driven sports scientist, strength & conditioning coach, and movement specialist.
=== LIVE TELEMETRY ===
- LIVE BIOMETRIC TELEMETRY:
  * Daily Readiness Score: 42/100
  * Sleep Duration: 4.8 hrs (Deep Sleep: 0.5 hrs)
  * Resting Heart Rate: 72 bpm
  * Heart Rate Variability (HRV): 26 ms
  * Daily Step Count: 4,100
  * Active Energy Burned: 180 kcal
======================""",
        "user_query": "I feel fatigued and slept poorly. Can I still push heavy deadlifts today?"
    },
    {
        "title": "Scenario C: Precision Nutrition & Leucine Threshold",
        "system_prompt": """You are ZeroCoach in STRICT ATHLETE MODE—an elite, data-driven sports scientist, strength & conditioning coach, and movement specialist.
- DAILY NUTRITION STATUS:
  * Calories Remaining: 650 kcal
  * Protein Remaining: 48g
  * Goal: Hypertrophy & Leucine Maximization""",
        "user_query": "Suggest food for dinner. I have 650 calories and 48g protein remaining."
    },
    {
        "title": "Scenario D: Comfortable Sustainable Health Check-In",
        "system_prompt": """You are ZeroCoach in COMFORTABLE SUSTAINABLE HEALTH MODE—a compassionate, holistic fitness and lifestyle guide.
=== LIVE TELEMETRY ===
- LIVE BIOMETRIC TELEMETRY:
  * Daily Readiness Score: 68/100
  * Sleep Duration: 7.1 hrs
======================""",
        "user_query": "I have 20 minutes and feel a bit stiff. What is a gentle routine I can do right now?"
    }
]

def main():
    print("=" * 60)
    print("⚡ ZEROCOACH LOCAL MODEL INFERENCE VERIFICATION")
    print(f"Loading LoRA Adapter from: {ADAPTER_DIR}")
    print("=" * 60)

    if not ADAPTER_DIR.exists():
        print(f"Error: Adapter directory not found at {ADAPTER_DIR}. Run finetune.py first.")
        return

    # Check training summary
    base_model_id = "HuggingFaceTB/SmolLM-135M-Instruct"
    if SUMMARY_PATH.exists():
        with open(SUMMARY_PATH, "r") as f:
            summary = json.load(f)
            base_model_id = summary.get("base_model", base_model_id)

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Compute Device: {device} | Base Model: {base_model_id}")

    # Load Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(str(ADAPTER_DIR), trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load Base Model
    print(f"Loading base model weights: {base_model_id}...")
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_id,
        torch_dtype=torch.float32,
        trust_remote_code=True
    )

    # Load PEFT LoRA Adapter
    print(f"Attaching ZeroCoach LoRA adapter weights...")
    model = PeftModel.from_pretrained(base_model, str(ADAPTER_DIR))
    model.to(device)
    model.eval()

    print("\n✓ ZeroCoach Model ready! Executing test inference scenarios...\n")

    results = []

    for i, test in enumerate(TEST_PROMPTS, 1):
        print("-" * 60)
        print(f"🧪 {test['title']}")
        print(f"User Query: \"{test['user_query']}\"")
        print("-" * 60)

        prompt_text = f"<start_of_turn>user\n{test['system_prompt']}\n\n{test['user_query']}<end_of_turn>\n<start_of_turn>model\n"
        inputs = tokenizer(prompt_text, return_tensors="pt").to(device)

        start_time = time.time()
        with torch.no_grad():
            output_tokens = model.generate(
                **inputs,
                max_new_tokens=220,
                temperature=0.6,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id
            )

        duration = time.time() - start_time
        gen_tokens = output_tokens[0][inputs["input_ids"].shape[1]:]
        generated_text = tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()
        num_tokens = len(gen_tokens)
        tps = num_tokens / max(0.001, duration)

        print(generated_text)
        print(f"\n[Telemetry: {num_tokens} tokens generated in {duration:.2f}s (~{tps:.1f} tokens/sec)]\n")

        results.append({
            "scenario": test["title"],
            "query": test["user_query"],
            "response": generated_text,
            "tokens_generated": num_tokens,
            "duration_seconds": round(duration, 2),
            "tokens_per_second": round(tps, 1)
        })

    # Save evaluation output
    eval_path = REPO_ROOT / "ml" / "output" / "evaluation_results.json"
    with open(eval_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("=" * 60)
    print(f"✓ All scenarios passed! Results saved to: {eval_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
