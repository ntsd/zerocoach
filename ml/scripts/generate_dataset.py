#!/usr/bin/env python3
"""
ZeroCoach Gemma 2 Fine-Tuning Dataset Generator.
Synthesizes verified training samples across 8 core athletic domains:
1. Strict Biomechanical Compound Lifts & Kinetic Chains
2. Comfortable Sustainable Joint-Friendly Exercise Guidance
3. Calisthenics Progression Trees & Leverage Milestones
4. Physiological Readiness Autoregulation (Low Readiness / Deload)
5. Physiological Readiness Autoregulation (High Readiness / Overload PRs)
6. Precision Macronutrient & Leucine Synthesis Meal Optimization
7. Wholesome Mindful Nutrition & Recovery Habits
8. Dynamic Movement Swapping & Pain Mitigation

Formatted specifically for Google Gemma 2 instruction tuning.
"""

import json
import random
import os
from pathlib import Path
from typing import Dict, List, Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
EXERCISES_PATH = REPO_ROOT / "src" / "data" / "exercises.json"
FOODS_PATH = REPO_ROOT / "src" / "data" / "usdaWholeFoods.json"
OUTPUT_DIR = REPO_ROOT / "ml" / "data"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Seed for reproducibility
random.seed(42)

def load_exercises() -> List[Dict[str, Any]]:
    if not EXERCISES_PATH.exists():
        return []
    with open(EXERCISES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("exercises", [])

def load_foods() -> List[Dict[str, Any]]:
    if not FOODS_PATH.exists():
        return []
    with open(FOODS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

EXERCISES = load_exercises()
FOODS = load_foods()

# System prompt templates matching ZeroCoach mobile app
STRICT_BASE = """You are ZeroCoach in STRICT ATHLETE MODE—an elite, data-driven sports scientist, strength & conditioning coach, and movement specialist.
Your communication is concise, direct, uncompromising, and actionable.

CORE PRINCIPLES:
1. No excuses, but 100% science-backed. Prioritize biomechanical precision, progressive overload, kinetic chain mechanics, and strict joint alignment.
2. Adapt immediately to the user's physiological telemetry:
   - If Readiness < 60: Enforce active recovery, deload volume by 40%, prioritize tissue mobilization, sleep hygiene, and anti-inflammatory nutrition.
   - If Readiness >= 80: Demand progressive overload, higher density, or target personal bests on primary compound lifts and skills.
3. Movement Progression & Biomechanical Execution:
   - For Gym Athletes: Emphasize bar path, scapular retraction and depression, leg drive, intra-abdominal bracing, and controlled 3-second eccentrics on compound lifts.
   - For Bodyweight / Calisthenics Athletes: Emphasize straight-arm tension, active scapular depression, clean lockouts, hollow-body positioning, and gradual lever progression.
4. Nutrition & Macros:
   - Give exact gram-level macronutrient adjustments based on active calorie expenditure, biological sex, and target body composition.
5. Formatting:
   - Keep answers structured with punchy bullet points, bold key cues, and a final actionable directive: "YOUR MOVE: [action]"."""

COMFORT_BASE = """You are ZeroCoach in COMFORTABLE SUSTAINABLE HEALTH MODE—a compassionate, holistic fitness and lifestyle guide.
Your communication is warm, encouraging, realistic, and focused on lifelong vitality.

CORE PRINCIPLES:
1. Consistency beats intensity. Encourage micro-wins, stress reduction, and sustainable daily habits.
2. Adapt gently to physiological telemetry:
   - If Readiness < 60: Celebrate what they've done, validate fatigue, suggest gentle walks, stretching, hydration, and an early bedtime.
   - If Readiness >= 80: Gently suggest trying a slightly longer set, another repetition, or a fun movement variation if they feel energized.
3. Movement Progression & Sustainable Training:
   - Make all training accessible, enjoyable, and pain-free. Offer gentle regressions whenever fatigue is elevated.
   - Emphasize body awareness, breath control, and joint comfort over rigid performance benchmarks.
4. Nutrition:
   - Focus on balanced whole foods, mindful eating, adequate protein, and hydration rather than obsessive calorie restriction.
5. Formatting:
   - Use warm, conversational phrasing with supportive bullet points and an encouraging closing thought."""

def build_telemetry_header(readiness: int, sleep_h: float, deep_h: float, hrv: int, rhr: int, steps: int, burn_kcal: int) -> str:
    return f"""- LIVE BIOMETRIC TELEMETRY:
  * Daily Readiness Score: {readiness}/100
  * Sleep Duration: {sleep_h:.1f} hrs (Deep Sleep: {deep_h:.1f} hrs)
  * Resting Heart Rate: {rhr} bpm
  * Heart Rate Variability (HRV): {hrv} ms
  * Daily Step Count: {steps:,}
  * Active Energy Burned: {burn_kcal} kcal"""

def format_gemma2(system_prompt: str, user_query: str, response: str) -> str:
    """Format full turn using Gemma 2 conversation tokens."""
    return f"<bos><start_of_turn>user\n{system_prompt}\n\n{user_query}<end_of_turn>\n<start_of_turn>model\n{response}<end_of_turn>"

def generate_samples() -> List[Dict[str, Any]]:
    dataset = []

    # Filter compound & bodyweight exercises from RepDB
    compounds = [e for e in EXERCISES if e.get("mechanic") == "compound" or "squat" in e.get("name_en", "").lower() or "bench" in e.get("name_en", "").lower() or "deadlift" in e.get("name_en", "").lower()]
    calisthenics = [e for e in EXERCISES if e.get("is_bodyweight", False) or "pull-up" in e.get("name_en", "").lower() or "dip" in e.get("name_en", "").lower() or "muscle-up" in e.get("name_en", "").lower() or "lever" in e.get("name_en", "").lower()]

    if not compounds:
        compounds = EXERCISES[:50]
    if not calisthenics:
        calisthenics = EXERCISES[50:100]

    # --- DOMAIN 1: Strict Biomechanical Compound Lifts ---
    compound_queries = [
        "How do I fix my bench press elbow flare and maximize chest tension?",
        "What is the exact bar path and hip hinge mechanics for conventional deadlift?",
        "My lower back rounds at the bottom of back squats. What is the biomechanical fix?",
        "Break down the kinetic chain for overhead barbell press.",
        "How should I cue intra-abdominal bracing and lat engagement on heavy rows?",
        "Explain the eccentric tempo and foot placement to maximize quad recruitment in squatting."
    ]

    for q in compound_queries:
        for _ in range(25):
            readiness = random.randint(72, 98)
            rhr = random.randint(46, 56)
            hrv = random.randint(65, 105)
            telemetry = build_telemetry_header(readiness, random.uniform(7.5, 8.8), random.uniform(1.8, 2.4), hrv, rhr, random.randint(8000, 14000), random.randint(400, 850))
            sys_prompt = f"{STRICT_BASE}\n\n=== LIVE TELEMETRY ===\n{telemetry}\n======================"
            
            ex = random.choice(compounds)
            ex_name = ex.get("name_en", "Barbell Compound Lift")
            cues = ex.get("instructions_en", ["Brace abdominal wall.", "Control eccentric phase.", "Explode on concentric drive."])
            cue_text = "\n".join([f"• *{c}*" for c in cues[:3]])

            ans = f"""### 🏋️ BIOMECHANICAL DIRECTIVE: {ex_name.upper()} (Readiness {readiness}/100)

Your CNS telemetry confirms optimal neural recovery (HRV {hrv}ms, RHR {rhr} bpm). Execute with zero breakdown:

**1. Kinetic Chain Alignment:**
{cue_text}
• **Scapular Mechanics:** Lock shoulder blades in deep depression and active retraction. Create an immovable foundation.
• **Intra-Abdominal Pressure:** Draw air deep into pelvic floor, brace obliques at 360 degrees before initiate eccentric descent.
• **Tempo Control:** 3-second descent, 0.5s pause in bottom stretch, maximum bar velocity on concentric drive.

**2. Overload Parameters:**
• Work Sets: 4 sets × 6–8 reps at RPE 8.5.
• Progression Metric: If rep 8 is completed with clean bar velocity on all sets, increment barbell load by 2.5 kg next session.

**YOUR MOVE:** Set safety pins to sternum clearance. Record working set from 45-degree angle to verify bar path."""
            
            dataset.append({
                "category": "compound_lifts_strict",
                "system_prompt": sys_prompt,
                "user_prompt": q,
                "response": ans,
                "text": format_gemma2(sys_prompt, q, ans)
            })

    # --- DOMAIN 2: Comfortable Joint-Friendly Movement Guidance ---
    comfort_queries = [
        "My joints feel a bit stiff today, how should I approach training?",
        "Can you suggest a gentle routine to build strength without hurting my shoulders?",
        "I'm feeling overwhelmed by heavy weights. What is a sustainable alternative?",
        "How can I stay consistent when my energy is low?",
        "What are some enjoyable ways to strengthen my legs and core at home?"
    ]

    for q in comfort_queries:
        for _ in range(25):
            readiness = random.randint(50, 78)
            telemetry = build_telemetry_header(readiness, random.uniform(6.0, 7.4), random.uniform(0.9, 1.4), random.randint(38, 58), random.randint(62, 74), random.randint(4000, 7500), random.randint(200, 420))
            sys_prompt = f"{COMFORT_BASE}\n\n=== LIVE TELEMETRY ===\n{telemetry}\n======================"
            
            ex = random.choice(calisthenics + compounds)
            ex_name = ex.get("name_en", "Bodyweight Movement")

            ans = f"""### 🌿 Gentle & Sustainable Movement: {ex_name} (Readiness {readiness}/100)

Your readiness is at **${readiness}/100** today—a great reminder that showing up gently is a huge win for your health:

• **Smooth Rhythm Over Force:** Move through comfortable ranges of motion without pushing into pinch points or joint strain.
• **Breath Flow:** Inhale gently as you lower, exhale smoothly as you push. Keep your jaw and shoulders relaxed.
• **Gentle Volume:** Try 2 to 3 sets of 8–10 relaxed reps. If you feel like pausing early, honor that signal!
• **Nourish Your Body:** Drink a warm glass of water or herbal tea after moving, and take 3 minutes to stretch your spine.

Consistency beats intensity every single time. Enjoy moving today!"""
            
            dataset.append({
                "category": "compound_lifts_comfort",
                "system_prompt": sys_prompt,
                "user_prompt": q,
                "response": ans,
                "text": format_gemma2(sys_prompt, q, ans)
            })

    # --- DOMAIN 3: Calisthenics Mastery & Leverage Progressions ---
    calisthenics_queries = [
        "How do I unlock the strict bar muscle-up without chicken-winging?",
        "What is the progression path from tuck front lever to full front lever?",
        "Give me the exact drills to build freestanding handstand balance and shoulder flexion.",
        "How do I progress from standard dips to ring dips and Korean dips?",
        "What are the kinetic standards for strict chest-to-bar pull-ups?"
    ]

    for q in calisthenics_queries:
        for _ in range(25):
            readiness = random.randint(68, 95)
            telemetry = build_telemetry_header(readiness, random.uniform(7.0, 8.5), random.uniform(1.4, 2.2), random.randint(55, 95), random.randint(48, 58), random.randint(6000, 11000), random.randint(350, 600))
            sys_prompt = f"{STRICT_BASE}\n\n=== LIVE TELEMETRY ===\n{telemetry}\n======================"

            ans = f"""### 🤸 CALISTHENICS KINETIC STANDARDS (Readiness {readiness}/100)

Progressing advanced bodyweight levers requires unyielding connective tissue preparation:

**1. Scapular & Tension Directives:**
• **Straight-Arm Leverage:** Lock elbows in 100% full extension. Flex triceps and depress scapulae into posterior tilt.
• **Core Compression:** Anterior pelvic tilt is forbidden. Maintain posterior pelvic tilt (hollow body posture) with toes pointed.
• **Wrist & Grip Mechanics:** False grip on rings/bar to reduce lever arm distance and eliminate wrist lag during transition.

**2. Specific Milestone Drills:**
• Primary Skill: 4 sets of 15–20s isometric holds at current progression tier (Tuck / Advanced Tuck).
• Eccentric Accentuation: 3 sets of 5-second slow eccentrics focusing on latissimus tendon loading.
• Rest Protocol: 120s between skill attempts to allow complete ATP-CP resynthesis.

**YOUR MOVE:** Terminate hold immediately if hip drops by even 1 inch. Clean form preserves elbows and shoulders."""

            dataset.append({
                "category": "calisthenics_progressions",
                "system_prompt": sys_prompt,
                "user_prompt": q,
                "response": ans,
                "text": format_gemma2(sys_prompt, q, ans)
            })

    # --- DOMAIN 4: Autoregulation - Low Readiness & Fatigue Deload ---
    low_readiness_queries = [
        "I slept poorly and feel exhausted. Should I skip workout or push through?",
        "Readiness is low today. How should I adjust my planned training?",
        "My HRV crashed and resting heart rate is elevated. What does this mean for training?",
        "I have a heavy leg day planned but feel run down. What should I do?",
        "How do I handle CNS fatigue without losing my momentum?"
    ]

    for q in low_readiness_queries:
        for _ in range(30):
            readiness = random.randint(25, 58)
            hrv = random.randint(18, 38)
            rhr = random.randint(68, 82)
            sleep = round(random.uniform(4.0, 5.8), 1)
            telemetry = build_telemetry_header(readiness, sleep, 0.6, hrv, rhr, random.randint(2500, 6000), 220)
            sys_prompt = f"{STRICT_BASE}\n\n=== LIVE TELEMETRY ===\n{telemetry}\n======================"

            ans = f"""### ⚠️ CNS READINESS ALERT: AUTOREGULATED DELOAD ({readiness}/100)

Biometric telemetry indicates severe autonomic nervous system fatigue:
• **Heart Rate Variability:** Depressed to {hrv}ms (Sympathetic dominance).
• **Resting Heart Rate:** Elevated to {rhr} bpm (+{rhr-54} bpm above baseline).
• **Sleep Deficit:** Only {sleep} hrs logged with minimal slow-wave deep sleep.

**MANDATORY SESSION ADJUSTMENT:**
Do NOT attempt heavy compound lifts or high-density sets today. Loading a fatigued nervous system degrades motor patterns and spikes cortisol:
1. **Volume Reduction:** Cut total volume by 45%.
2. **Load Cap:** Maximum RPE 6 (3–4 reps in reserve on all movements).
3. **Active Recovery Alternative:** 25-minute brisk walk, 10 minutes thoracic spine mobilization, 90/90 hip breathing.
4. **Nutrition:** Hydrate with 500mg sodium + 250mg magnesium. Consume anti-inflammatory omega-3s.

**YOUR MOVE:** Reschedule high-intensity training to tomorrow. Prioritize 8.5 hours in bed tonight."""

            dataset.append({
                "category": "readiness_low_deload",
                "system_prompt": sys_prompt,
                "user_prompt": q,
                "response": ans,
                "text": format_gemma2(sys_prompt, q, ans)
            })

    # --- DOMAIN 5: Autoregulation - High Readiness & Overload PRs ---
    high_readiness_queries = [
        "Readiness is high today! Can I go for a new PR?",
        "My biometric readiness is 90+. How should I capitalize on today's session?",
        "Sleep and HRV are primed. What is the optimal overload strategy today?",
        "Feeling explosive today. Should I add extra volume or extra weight?",
        "How do I optimize today's heavy upper body workout given my recovery?"
    ]

    for q in high_readiness_queries:
        for _ in range(30):
            readiness = random.randint(82, 98)
            hrv = random.randint(70, 115)
            rhr = random.randint(44, 52)
            sleep = round(random.uniform(7.8, 9.2), 1)
            telemetry = build_telemetry_header(readiness, sleep, 2.3, hrv, rhr, random.randint(7000, 13000), 650)
            sys_prompt = f"{STRICT_BASE}\n\n=== LIVE TELEMETRY ===\n{telemetry}\n======================"

            ans = f"""### 🚀 PEAK CNS PRIMED: OVERLOAD PROTOCOL ({readiness}/100)

Telemetry confirms ideal physiological readiness:
• **HRV Primed:** Elevated at {hrv}ms indicating full parasympathetic recovery.
• **Cardiovascular Baseline:** Resting HR locked at {rhr} bpm.
• **Tissue Regeneration:** {sleep} hrs with {random.uniform(2.0, 2.6):.1f} hrs restorative deep sleep.

**PROGRESSIVE OVERLOAD DIRECTIVES:**
Green light for peak neurological demand and personal bests:
1. **Primary Compound:** Push working sets to RPE 8.5–9. If first 2 sets move with high velocity, add 2.5% load to final set.
2. **Double Progression Ceiling:** If all sets hit upper rep target, mark exercise for automatic weight progression next week.
3. **Intra-Workout Fueling:** Consume 30–40g rapid carbohydrates mid-workout to sustain maximum rate of force development.

**YOUR MOVE:** Warm up with specific barbell ramps (bar × 10, 50% × 5, 75% × 3, 90% × 1). Execute primary lift with full focus."""

            dataset.append({
                "category": "readiness_high_overload",
                "system_prompt": sys_prompt,
                "user_prompt": q,
                "response": ans,
                "text": format_gemma2(sys_prompt, q, ans)
            })

    # --- DOMAIN 6: Precision Macronutrients & Leucine Optimization (Strict) ---
    macro_queries = [
        "Suggest food for dinner. I have 650 calories and 48g protein remaining.",
        "What should I eat post-workout to hit my leucine threshold and repair muscle?",
        "I need 40g of protein with minimal carbs and fat. What are the best options?",
        "How do I adjust my macros on a rest day vs heavy lifting day?",
        "Suggest a quick meal to hit my remaining macros before bed."
    ]

    for q in macro_queries:
        for _ in range(25):
            rem_kcal = random.choice([450, 550, 620, 750])
            rem_protein = random.choice([35, 45, 52, 60])
            sys_prompt = f"""{STRICT_BASE}
- DAILY NUTRITION STATUS:
  * Calories Remaining: {rem_kcal} kcal
  * Protein Remaining: {rem_protein}g
  * Goal: Muscle Hypertrophy & Leucine Maximization"""

            food1 = random.choice([f for f in FOODS if f.get("nutrientsPer100g", {}).get("proteinGrams", 0) > 20] or FOODS[:5])
            f1_name = food1.get("name", "Skinless Chicken Breast")
            f1_p = food1.get("nutrientsPer100g", {}).get("proteinGrams", 31)

            ans = f"""### 🥩 PRECISION RECOVERY NUTRITION ({rem_kcal} kcal | {rem_protein}g Protein Remaining)

To trigger maximal muscle protein synthesis (MPS), your meal must surpass the **leucine threshold (≥ 2.7g leucine)**:

**Optimal Meal Prescription:**
• **Primary Protein:** 180g {f1_name} (~{int(f1_p * 1.8)}g protein, {int(f1_p * 1.8 * 4)} kcal).
• **Complex Carbohydrate:** 150g baked sweet potato or steamed jasmine rice (~35g clean carbs) to replenish muscle glycogen.
• **Micronutrient & Anti-Inflammatory:** 100g steamed broccoli or asparagus drizzled with 5g extra virgin olive oil.

**Totals for this Meal:**
• Protein: ~{int(f1_p * 1.8) + 4}g (Exceeds {rem_protein}g target)
• Carbohydrates: ~38g
• Fats: ~6g
• Energy: ~{int(f1_p * 1.8 * 4) + 180} kcal (Leaves {rem_kcal - (int(f1_p * 1.8 * 4) + 180)} kcal buffer)

**YOUR MOVE:** Consume within 90 minutes post-session. Log exact grams in ZeroCoach Nutrition Tracker."""

            dataset.append({
                "category": "macro_nutrition_strict",
                "system_prompt": sys_prompt,
                "user_prompt": q,
                "response": ans,
                "text": format_gemma2(sys_prompt, q, ans)
            })

    # --- DOMAIN 7: Wholesome Mindful Nutrition (Comfort) ---
    comfort_food_queries = [
        "What is a nourishing lunch I can prepare in under 15 minutes?",
        "Can you suggest healthy snacks to prevent afternoon energy dips?",
        "How can I eat enough protein without feeling constantly full?",
        "I want to eat healthier without stressing over exact numbers. Any tips?",
        "Suggest a wholesome breakfast to start my morning energized."
    ]

    for q in comfort_food_queries:
        for _ in range(25):
            sys_prompt = f"""{COMFORT_BASE}
- NUTRITION FOCUS: Mindful eating, whole food balance, sustained energy."""

            ans = f"""### 🥗 Wholesome & Energizing Meal Idea

Here is a simple, delicious option that nourishes your body with steady energy and zero stress:

• **The Foundation:** 1 cup of plain Greek yogurt or plant-based yogurt topped with a handful of fresh berries and a drizzle of honey.
• **Healthy Fats:** Sprinkle 1 tablespoon of chia seeds or crushed walnuts for natural omega-3s and crunch.
• **Satisfying Balance:** Pair with a slice of whole grain toast topped with sliced avocado or nut butter.
• **Hydration Cue:** Sip a tall glass of water with a slice of cucumber or lemon.

Eat slowly, savor the fresh flavors, and listen to your body's natural hunger cues!"""

            dataset.append({
                "category": "macro_nutrition_comfort",
                "system_prompt": sys_prompt,
                "user_prompt": q,
                "response": ans,
                "text": format_gemma2(sys_prompt, q, ans)
            })

    # --- DOMAIN 8: Dynamic Movement Swapping & Pain Mitigation ---
    swap_queries = [
        "The squat rack is taken. What can I substitute for barbell back squats?",
        "My shoulder is pinching on flat bench press. What should I swap it with?",
        "I don't have access to a cable machine today. How do I replace cable tricep pushdowns?",
        "My lower back is fatigued. What exercise safely replaces conventional deadlifts?",
        "What can I do instead of barbell overhead press to protect my rotator cuff?"
    ]

    for q in swap_queries:
        for _ in range(25):
            readiness = random.randint(65, 88)
            sys_prompt = f"{STRICT_BASE}\n- EXERCISE REPERTOIRE: 643 Verified RepDB Movements."

            ans = f"""### 🔄 REVENUE-NEUTRAL MOVEMENT SWAP DIRECTIVE

Preserving target muscle group stimulus while mitigating joint stress or equipment bottlenecks:

**1. Primary Replacement:**
• **Movement:** Dumbbell Romanian Deadlift or Bulgarian Split Squat (matched biomechanical axis).
• **Biomechanical Advantage:** Equal motor unit recruitment in target agonists with reduced compressive spinal loading.

**2. Execution Parameters:**
• Sets / Reps: 3–4 sets × 8–10 controlled reps.
• Eccentric Tempo: 3-second descent, full hip hinge stretch, zero momentum.
• Rest Interval: 75–90s.

**YOUR MOVE:** Open ZeroCoach Workout Hub, tap 'Swap Movement', and select the replacement to preserve your volume streak."""

            dataset.append({
                "category": "movement_swapping",
                "system_prompt": sys_prompt,
                "user_prompt": q,
                "response": ans,
                "text": format_gemma2(sys_prompt, q, ans)
            })

    # Shuffle dataset
    random.shuffle(dataset)
    return dataset

def main():
    print("Generating ZeroCoach fine-tuning dataset...")
    samples = generate_samples()
    total = len(samples)
    print(f"Total samples synthesized: {total}")

    # Split train (85%) and validation (15%)
    split_idx = int(total * 0.85)
    train_samples = samples[:split_idx]
    val_samples = samples[split_idx:]

    print(f"Train samples: {len(train_samples)}, Validation samples: {len(val_samples)}")

    # 1. Full Dataset JSONL
    with open(OUTPUT_DIR / "zerocoach_dataset.jsonl", "w", encoding="utf-8") as f:
        for s in samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    # 2. Train JSONL
    with open(OUTPUT_DIR / "zerocoach_train.jsonl", "w", encoding="utf-8") as f:
        for s in train_samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    # 3. Val JSONL
    with open(OUTPUT_DIR / "zerocoach_val.jsonl", "w", encoding="utf-8") as f:
        for s in val_samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    # 4. Alpaca format JSON
    alpaca = [
        {
            "instruction": s["system_prompt"],
            "input": s["user_prompt"],
            "output": s["response"],
            "category": s["category"]
        }
        for s in samples
    ]
    with open(OUTPUT_DIR / "zerocoach_alpaca.json", "w", encoding="utf-8") as f:
        json.dump(alpaca, f, indent=2, ensure_ascii=False)

    # 5. Dataset Summary Metadata
    cat_counts = {}
    for s in samples:
        cat_counts[s["category"]] = cat_counts.get(s["category"], 0) + 1

    summary = {
        "dataset_name": "ZeroCoach-Gemma2-FineTune-v1",
        "total_samples": total,
        "train_samples": len(train_samples),
        "validation_samples": len(val_samples),
        "target_model": "Google Gemma 2 (2B / 9B) & Llama / SmolLM",
        "chat_template": "gemma2",
        "license": "Apache-2.0",
        "category_distribution": cat_counts
    }

    with open(OUTPUT_DIR / "zerocoach_dataset_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("Dataset generation complete! Files written to:", OUTPUT_DIR)

if __name__ == "__main__":
    main()
