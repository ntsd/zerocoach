# ZeroCoach

[![Website](https://img.shields.io/badge/Website-zerocoach.tech-00F0FF?style=flat&logo=astro)](https://zerocoach.tech)
[![GitHub Release](https://img.shields.io/github/v/release/ntsd/zerocoach?color=00F0FF&label=Latest%20Release)](https://github.com/ntsd/zerocoach/releases/latest)
[![Download APK](https://img.shields.io/badge/Download-Android%20APK%20v1.1.0-00F0FF?style=flat&logo=android)](https://github.com/ntsd/zerocoach/releases/latest/download/ZeroCoach-v1.1.0.apk)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

ZeroCoach is an open-source, privacy-first mobile fitness and athletic AI coaching application powered entirely by on-device and local AI models. Built with React Native and Expo, it delivers science-backed workout programming, adaptive nutrition targets, and real-time coaching—with zero cloud latency and absolute data privacy.

Visit the official website at [**zerocoach.tech**](https://zerocoach.tech).

---

## 🎬 Demo Video

[![ZeroCoach Video Demo](https://img.youtube.com/vi/Ns-7ikl16K0/maxresdefault.jpg)](https://youtu.be/Ns-7ikl16K0)

▶️ **Watch the Full HD Demo on YouTube**: [**https://youtu.be/Ns-7ikl16K0**](https://youtu.be/Ns-7ikl16K0)

*Featuring on-device Gemma 2 GGUF inference streaming at ~38 tok/s, multimodal food plate vision decomposition & micronutrient analysis, RepDB adaptive workout engine, and unified 7-day athletic telemetry.*

---

## 📸 App Preview

| 💬 Coach Chat | 🥗 Nutrition Tracker | 🏋️ Adaptive Workout |
|:---:|:---:|:---:|
| <img src="assets/screenshots/coach_chat.png" width="270" alt="Coach Chat" /> | <img src="assets/screenshots/nutrition_tracker.png" width="270" alt="Nutrition Tracker" /> | <img src="assets/screenshots/adaptive_workout.png" width="270" alt="Adaptive Workout" /> |
| **Gemma 2 On-Device Coach**<br>Real-time athletic guidance & dual persona | **Smart Nutrition & Macros**<br>Gemini Vision, NutriSight & 11 RDAs | **Adaptive Workout Hub**<br>RepDB 643 exercises & Date Navigation |

<br/>

| 📈 Performance & Trends | ⚙️ On-Device Engine |
|:---:|:---:|
| <img src="assets/screenshots/performance_analyze.png" width="270" alt="Performance & Trends" /> | <img src="assets/screenshots/model_settings.png" width="270" alt="On-Device Engine Settings" /> |
| **Multi-Domain Analytics**<br>0–100 composite score & Health Connect | **Hardware Acceleration**<br>Quantized GGUF execution & local endpoints |

---

## ✨ Key Features

- ⚡ **AI Chat (Agent Mode with Action Harness)**: Autonomous tool execution harness that reads and writes across all 7 core app domains (telemetry, food history, food DB, workout history, workout plan, RepDB, and athlete settings) in real-time.
- 📱 **100% On-Device AI Inference**: Runs quantized LLM models (e.g. Google Gemma 2) locally with hardware acceleration—zero cloud latency, zero API costs, and absolute data privacy.
- 🔌 **OpenAI-Compatible Local Endpoints**: Connect seamlessly to local network LLM runners like Ollama, LM Studio, vLLM, or desktop llama.cpp servers.
- 🔄 **Symmetric UI & AI Access Parity**: 100% parity between direct App UI manipulation and conversational AI commands—log meals, swap workout exercises, modify macro targets, and view wearable biometrics conversationally or through screens.
- 💬 **Conversational Athletic Coach**: Real-time AI coaching with dual personas (*Strict* vs. *Comfort*), auto-regulating advice based on live recovery metrics and nutrition.
- 🏋️ **Goal-Driven Adaptive Training & Persistent Plans**: Automatically generates personalized workout splits based on readiness scores, equipment (Gym vs. Bodyweight), and athlete skill level, stored persistently by date.
- 📅 **Calendar Date Navigation**: Seamless date navigation across both Workout and Nutrition modules—review past sessions, modify upcoming routines, or plan ahead with instant 1-tap jump to today.
- 📚 **RepDB Exercise Library**: Integrated catalog of 643 science-backed exercises with start/peak pose previews, customizable movement swapping, and skipping.
- 🥗 **Smart Nutrition & Multimodal Vision**: Dual-mode camera scanner featuring **Gemini 3.8 Flash** food plate analysis and **Open Food Facts NutriSight** label extraction alongside 11 micronutrient RDA bio-scores.
- 📈 **Unified Athletic Analytics**: Multi-domain bio-history tracking recovery, workout volume, and nutrition with composite scoring and SVG trendline charts.
- ⌚ **Universal Wearable & Health Sync**: Direct on-device sync with Android Health Connect and Apple HealthKit to aggregate sleep, HRV, heart rate, and steps across Garmin, Apple Watch, Whoop, Oura, Samsung, and more.
- 🎨 **Privacy-First Obsidian Interface**: Dark-mode glassmorphic aesthetic optimized for fluid mobile interactions and system safe insets.

---

## 🏗️ Architecture & Tech Stack

ZeroCoach is engineered for privacy, speed, and resilient offline execution with complete symmetric access parity:

> 📘 **Full Architecture Specification**: See [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) for detailed Mermaid diagrams, sequence flows, tool schemas, and token-saving patterns.

| Layer | Technology |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (TypeScript) |
| **Agent Action Harness** | Autonomous multi-turn Tool Execution Dispatcher with live action status pills and hybrid tool calling protocol |
| **On-Device Inference** | [llama.rn](https://github.com/mybigday/llama.rn) (React Native bindings for `llama.cpp`) running quantized GGUF models |
| **Local LLM Providers** | OpenAI-compatible SSE streaming client supporting Ollama, LM Studio, and vLLM |
| **Web Inference Engine** | Automatic deterministic simulation engine when running in browser environments |
| **Exercise Database** | Open Exercise Repository adapted from [RepDB](https://repdb.co) (643 movements with verified CDN pose assets) |
| **Nutrition Databases** | [Open Food Facts](https://world.openfoodfacts.org/) API + USDA FoodData Central whole foods dataset + NutriSight token extraction |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) with AsyncStorage local persistence (`historyByDate`, `plansByDate`, `logsByDate`) |
| **Styling & Design** | Sleek Cyber-Athletic Dark Mode (`#080B10`), HSL accents, and glassmorphic micro-components |
| **Icons** | [Lucide React Native](https://lucide.dev/) |
| **Marketing Website** | [Astro](https://astro.build/) + [Tailwind CSS](https://tailwindcss.com/) in `/web` (deployed on [Render](https://render.com/) at `zerocoach.tech`) |

### 📊 7-Domain Symmetric Read/Write Parity

| Domain | App UI Access | AI Agent Harness Access |
|---|---|---|
| **1. Fitness Telemetry** | View Readiness (0–100), HRV, resting HR, sleep, steps, and sync wearables | **Read**: `get_telemetry_metrics()`<br>**Action**: `sync_fitness_telemetry()` |
| **2. Food History** | Browse meal logs by date, log meals, delete items, update macro targets | **Read**: `get_food_history()`<br>**Write**: `log_food_item()`, `delete_logged_food()`, `update_daily_macro_targets()` |
| **3. Food Database** | Search whole foods (USDA), query packaged goods (Open Food Facts), scan barcodes | **Read**: `search_food_database()`, `get_food_details()` |
| **4. Workout History** | Review past workout sessions, volume, and sets by calendar date | **Read**: `get_workout_history()`<br>**Write**: `log_completed_workout()` |
| **5. Workout Plan** | View adaptive daily splits, swap/skip exercises, schedule future routines | **Read**: `get_workout_plan()`<br>**Write**: `update_workout_plan()`, `swap_plan_exercise()` |
| **6. Workout Database (RepDB)** | Browse 643 movements, filter by muscle/equipment, view poses & cues | **Read**: `search_exercises()`, `get_exercise_details()` |
| **7. ZeroCoach Settings** | Update athlete profile, goals, weight/height, switch coach persona, language | **Read**: `get_user_settings()`<br>**Write**: `update_user_settings()` |

---

## 📱 App Navigation & Modules

### 1. 💬 Coach (`CoachChatScreen`)
- **Always-On Action Harness**: Automatically calls tools to read/write food logs, workout plans, and biometrics directly from natural chat.
- **Live Activity Feed**: Displays real-time tool execution pills (e.g. `⚡ HARNESS: LOGGING 200G CHICKEN BREAST...`) and verification badges upon completion.
- Formatted response rendering for structured lists, kinetic cues, bold titles, and biomechanical guidance.
- Synchronized with active wearable telemetry (HRV, resting heart rate, sleep duration, calorie burn) and **today's logged nutrition totals & remaining macros**.
- Context-aware coaching chips:
  - *Suggest Food*, *Suggest Workout Plan*, *Adjust Macros*, *Readiness Review*, *Bodyweight Cues*.
  - Deep-link action pills (*"Log Food in Nutrition Tracker"*, *"View Workout & Progressions"*).

### 2. 🥗 Nutrition (`NutritionScreen`)
- **Macro Progress Header**: Real-time calorie gauge, remaining energy budget, and progress bars for Protein, Carbs, Fat, and Dietary Fiber.
- **Date Navigation**: Easily browse, edit, and log meals across any historical date or jump to today.
- **Micronutrient Bio-Profile Scorecard**: Expandable RDA tracker for Vitamins (A, C, D, B12) and Minerals (Iron, Calcium, Magnesium, Potassium, Sodium limit, Zinc).
- **Meal Sections**: Structured daily tracking across Breakfast, Lunch, Dinner, and Snacks.
- **Log Food Modal**:
  - *Database Search*: Search whole foods (USDA) and packaged products (Open Food Facts).
  - *Barcode Scanner*: Scan barcodes or enter codes with instant OFF product lookup.
  - *Snap / NutriSight Label Scanner*: Dual-mode camera scanner featuring **Open Food Facts NutriSight** (`openfoodfacts/nutrition-extractor` LayoutLMv3 token schema) to extract exact nutrition tables (calories, protein, carbs, fat, fiber, sodium, and serving grams) from packaging labels, alongside multimodal cooked meal plate decomposition via Gemini 3.8 Flash.
  - *Portion Review Sheet*: Adjust grams/servings with real-time nutrient recalculation before logging.

### 3. 🏋️ Workout (`ProgressionsScreen`)
- **Date Navigation**: Full parity with nutrition tracking—navigate between previous days' recorded workouts and future planned splits.
- **Training Goal & Skill Level Selectors**: Tailor routines for *Strength*, *Calisthenics*, *Fat Loss*, *Cardio*, or *Longevity* across *Beginner*, *Intermediate*, or *Advanced* tiers.
- **Workout Split Hub**: Select *Full Body*, *Push*, *Pull*, *Legs*, *Upper*, *Lower*, *Core & Mobility*, *Calisthenics Skills*, or *Cardio Engine*.
- **Coach Suggestion Banner**: 1-tap apply for CNS readiness-tailored split recommendations.
- **Adaptive Daily Exercise Plan**:
  - Complete routine with dynamic warmups, primary compound lifts, secondary volume, and cooldowns.
  - RepDB movement specifications: target sets/reps, rest intervals, equipment, target muscles, and MET burn.
  - **Skip / Restore**: Skip exercises dynamically without distorting completion progress.
  - **Swap Movement**: Instant replacement with any exercise targeting the same muscle group.
  - **Add Skill / Exercise from RepDB**: Search and select from 643 exercises (with quick filters for Pull-ups, Dips, Squats, etc.).
  - **Kinetic Pose Previews**: Exercise detail modal showing start and peak pose images.

### 4. 📈 Analyze & Telemetry (`AnalyzeScreen`)
- **Unified Athletic Performance Score**: Daily 0–100 composite score combining Central Nervous System (CNS) recovery (35%), workout adherence (35%), and nutrition target accuracy (30%).
- **Interactive Multi-Domain Bio-History**: Filter across 7-day, 14-day, and 30-day time ranges with smooth SVG trendline charts and volume bar charts.
- **Dynamic CNS Readiness Gauge**: Evaluates recovery status based on HRV, resting heart rate, sleep duration, and deep sleep architecture.
- **Native OS Health Hub Bridge**: Connects locally to Android Health Connect or Apple HealthKit to read biometrics from paired wearables (Garmin, Apple Watch, Samsung, Whoop, Oura, Pixel, Xiaomi, Strava) with zero remote API latency.
- **Domain Breakdown**: Dedicated trend tabs for *Workout* (sessions, active burn, set volume), *Nutrition* (calorie compliance, macro balance), and *Recovery* (sleep quality, HRV).
- **Smart Scale Auto-Sync**: Automatically updates athlete body weight and recalibrates daily nutrition targets whenever a new weigh-in is detected.

### 5. ⚙️ Settings & Engine (`ModelManagerScreen`)
- **Inference Provider Configuration**:
  - `On-Device`: Direct quantized GGUF execution via `llama.rn` on iOS/Android, with automatic browser fallback for web previews.
  - `OpenAI-Compatible`: Connect to local desktop or LAN endpoints (e.g., `http://192.168.1.100:11434/v1` for Ollama).
- **Local Storage Management**: One-tap clearance for chat transcripts or full athlete biometric data wipe.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm** or **yarn**
- **Mobile Development**: Xcode (iOS) or Android Studio / Android SDK (Android)
- **Web Development**: Modern Chromium, Safari, or Firefox browser

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ntsd/zerocoach.git
cd zerocoach

# 2. Install dependencies
npm install
```

### Running Locally

```bash
# Start the Expo development server
npm start

# Run in Web browser (Instant preview with automated web engine)
npm run web

# Run on Android (Physical device or emulator)
npm run android

# Run on iOS (Physical device or simulator - macOS only)
npm run ios
```

---

## 🌐 Marketing Website (`/web`)

The official marketing website for ZeroCoach is located in `/web` and hosted on [Render](https://render.com) at [**zerocoach.tech**](https://zerocoach.tech).

### Local Development

```bash
cd web
npm install
npm run dev
```

### Production Build

```bash
cd web
npm run build
npm run preview
```

### Deployment on Render

ZeroCoach includes a root [`render.yaml`](render.yaml) Blueprint configured for zero-config Render static site deployments:
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Root Directory**: `web`
- **Custom Domains**: `zerocoach.tech` and `www.zerocoach.tech`

---

## 📦 Standalone Android APK (No Play Store Required)

Pre-built signed release APKs are available on the [**GitHub Releases**](https://github.com/ntsd/zerocoach/releases) page for immediate download.

To build the APK locally from source:

```bash
# Build standalone release APK (bundles JS, assets, and native llama.rn libraries)
npm run build:apk

# Generated APK output:
# android/app/build/outputs/apk/release/app-release.apk

# Sideload directly to a connected Android device:
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### ⚡ Over-The-Air (OTA) Updates (iOS & Android)

ZeroCoach supports Over-The-Air (OTA) hotfixes via `expo-updates`. Bug fixes, coach prompt refinements, UI improvements, and calculation updates can be deployed directly to existing Android and iOS installs without rebuilding binaries:

```bash
# Push an instant OTA hotfix to both Android and iOS installs
npm run update:publish -- --message "Fix macro calculation and prompt tuning"
```

Users can also tap **"CHECK FOR OTA UPDATES"** anytime in **Settings → Over-The-Air (OTA) Hotfix Channel** to check for and apply updates on-demand.

---

## 🧠 Model Configuration & GGUF Support

When using on-device inference on physical devices:
1. **Primary Recommended Baseline**: **Google Gemma 2 2B Instruct** (`gemma-2-2b-it-Q4_K_M.gguf`, ~1.64 GB). The official default on-device engine for robust multi-turn coaching, biomechanical cues, and structured nutrition planning.
2. **Experimental Compact Model**: **ZeroCoach Athletic Intelligence** (`zerocoach-athletic-q4_0.gguf`, 91.7 MB). An experimental 135M parameter fine-tune quantized to Q4_0, built for ultra-lightweight offline mobile tests within GitHub's 100 MB push limit.
3. **Desktop / LAN Serving**: For zero mobile RAM consumption, run `ollama run gemma2:2b` or LM Studio on your local network and point **Settings → OpenAI-Compatible Provider** to your host IP.

---

## 🤖 Model Fine-Tuning & Vector Embeddings Pipeline

ZeroCoach includes a complete, autonomous machine learning pipeline located in [`/ml`](ml/) to fine-tune on-device language models (e.g. Google Gemma 2 2B/9B, SmolLM, Qwen) and pre-compute dense vector embeddings for instantaneous sub-millisecond retrieval.

### 1. Dataset Generation (`/ml/scripts/generate_dataset.py`)

Synthesizes 1,075 verified athletic coaching pairs across 8 core domains formatted in native Gemma 2 chat tokens (`<start_of_turn>user...<end_of_turn><start_of_turn>model...<end_of_turn>`) and Alpaca JSON:
- Biomechanical Compound Lifts & Kinetic Cues (Squat, Bench, Deadlift, Row, OHP)
- Gentle & Sustainable Joint-Friendly Adaptations (Comfort persona)
- Calisthenics Leverage Milestones (RepDB bodyweight standards)
- Autoregulation for Low Readiness (<60 / Deload) & High Readiness (>=80 / Overload PRs)
- Precision Macronutrient Optimization (Leucine threshold >= 2.7g)
- Movement Swapping & Pain Mitigation

```bash
# Generate the dataset (outputs to ml/data/)
./ml/venv/bin/python3 ml/scripts/generate_dataset.py
```

### 2. Dense Vector Embeddings (`/ml/scripts/generate_embeddings.py`)

Computes 384-dimensional normalized dense vectors for all 643 RepDB movements and USDA whole food items using `sentence-transformers/all-MiniLM-L6-v2`. Enables offline semantic search, movement swapping, and smart meal lookups with zero network calls:

```bash
# Generate vector indices (JSON & safetensors)
./ml/venv/bin/python3 ml/scripts/generate_embeddings.py

# Test local semantic vector retrieval
./ml/venv/bin/python3 ml/embeddings/vector_search.py
```

### 3. Local LoRA Fine-Tuning (`/ml/scripts/finetune.py`)

Trains parameter-efficient LoRA adapters using Apple Silicon MPS (Metal Performance Shaders) or CUDA acceleration:

```bash
# Train on device with MPS GPU acceleration
./ml/venv/bin/python3 ml/scripts/finetune.py --epochs 2 --batch_size 4 --grad_accum 2

# Checkpoint output: ml/output/zerocoach_lora_adapter/
```

### 4. Local Inference Verification (`/ml/scripts/test_inference.py`)

Runs the fine-tuned LoRA adapter locally across real telemetry scenarios (readiness scoring, fatigue deloads, macro suggestions):

```bash
./ml/venv/bin/python3 ml/scripts/test_inference.py
```

### 5. Web Distribution on `zerocoach.tech`

All datasets, adapters, and embedding tensors are staged for direct public download from [`zerocoach.tech/models/`](https://zerocoach.tech#models):
- `zerocoach_dataset.jsonl` (Full 1,075 sample JSONL)
- `zerocoach_alpaca.json` (Alpaca format)
- `zerocoach_embeddings.safetensors` (Binary normalized embeddings)
- `adapter/adapter_model.safetensors` (Trained LoRA weights)
- `model_manifest.json` (SHA-256 verified release manifest)

---

## 📄 License

ZeroCoach is released under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.
