# ZeroCoach

ZeroCoach is an open-source, privacy-first mobile fitness and AI coaching application powered entirely by on-device and local AI models. Built with React Native and Expo, it delivers science-backed workout programming, adaptive nutrition targets, and real-time coaching—with zero cloud latency and absolute data privacy.

---

## ✨ Features

- 📱 **100% On-Device AI Inference**: Runs quantized GGUF models (e.g., Gemma 2) directly on your device's hardware using `llama.rn` with Metal (iOS) and GPU/OpenCL (Android) hardware acceleration. All athlete metrics, biometrics, and chat transcripts stay strictly on your phone.
- 🔌 **OpenAI-Compatible Local Endpoint Support**: Seamlessly switch between on-device inference and local desktop LLM servers (Ollama, LM Studio, vLLM, llama.cpp server) or OpenAI-compatible inference APIs with full streaming token generation.
- 🏋️ **RepDB Open Exercise Database**: Powered by an integrated database of 643 science-backed exercises categorized by movement type (Compound, Isolation, Bodyweight, Plyometric, Warmup, Cooldown), mechanical target muscle groups, and metabolic equivalents (MET).
- 🔄 **Adaptive Training Generator**: Dynamically generates tailored daily routines based on your equipment preference (**Full Gym** vs. **Bodyweight / Home**) and daily physiological readiness score.
- 🎯 **Milestone Progressions & Benchmark Mastery**:
  - **Gym Benchmarks**: Barbell Bench Press, Barbell Back Squat, and Barbell Bent-Over Row milestone trees with relative bodyweight standards.
  - **Bodyweight & Skill Mastery**: Push-Up & Dip progression, Pull-Up to Bar Muscle-Up progression, and Core & L-Sit progressions.
- 🥗 **Smart Nutrition & Micronutrient Bio-Tracking**:
  - Precision macronutrient monitoring: Calories, Carbs, Protein, Fat, and Dietary Fiber with dynamic athlete targets.
  - Complete micronutrient bio-scorecard tracking key vitamins (A, C, D, B12, E) and minerals/electrolytes (Iron, Calcium, Magnesium, Potassium, Sodium, Zinc) against RDA baselines.
  - Dual open data source engine:
    - **Open Food Facts API**: Instant barcode scan and packaged grocery lookup.
    - **Bundled USDA Whole Foods Database**: 100% offline, lab-assayed staple raw foods for complete micronutrient profiles.
  - **AI Meal Decomposer**: Natural-language composite meal parsing and photo plate simulator for home-cooked meals.
  - **Coach Prompt Injection**: Live nutrition totals and remaining macros are automatically fed into the AI Coach's system prompt for intelligent nutrition advice.
- ⚡ **Dual Coaching Personas**:
  - **Strict Coach**: High-intensity, uncompromising athletic conditioning focused on progressive overload, kinetic chain alignment, and accountability.
  - **Comfort Coach**: Sustainable, empathetic habit-building focused on longevity, recovery pacing, and joint health.
- ⌚ **Universal Multi-App Wearable & Health Sync (100% On-Device)**:
  - **Android Health Connect (`react-native-health-connect`)**: Connects natively to the Android OS health database.
  - **Apple HealthKit (`react-native-health`)**: Connects natively to iOS HealthKit.
  - **Universal Fitness Companion Aggregation**: Automatically ingests biometrics from **Garmin Connect, Apple Watch, Samsung Health, Whoop 4.0, Oura Ring, Google Fit, Strava, and Xiaomi (Mi Fitness)** without requiring individual brand developer portal accounts or remote cloud aggregators.
  - **Live Biometric Telemetry**: Daily Step counts, Active Energy Burned (kcal), Resting Heart Rate (BPM), Heart Rate Variability (HRV rMSSD/SDNN), and Sleep Architecture (total hours and deep sleep percentage).
  - **Smart Scale & Body Weight Auto-Sync**: Automatically detects synced weight readings from smart scales/wearables, updates athlete profile weight, and recalculates daily Coach calorie and macro targets.
  - **Graceful Web & Simulator Fallback**: Built-in simulated device bridge and interactive **Fitness App Sync Bridge** modal for zero-setup previews in Web, Simulator, and Expo Go.
- 📱 **Mobile & iPhone Optimized**: Tuned for modern mobile viewports (including iPhone 16 Dynamic Island) with locked dark viewport shells, zero white canvas overscroll, and compact horizontal scrolling chip bars.

---

## 🏗️ Architecture & Tech Stack

ZeroCoach is engineered for privacy, speed, and resilient offline execution:

| Layer | Technology |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (TypeScript) |
| **On-Device Inference** | [llama.rn](https://github.com/mybigday/llama.rn) (React Native bindings for `llama.cpp`) running quantized GGUF models |
| **Local LLM Providers** | OpenAI-compatible SSE streaming client supporting Ollama, LM Studio, and vLLM |
| **Web Inference Engine** | Automatic deterministic simulation engine when running in browser environments |
| **Exercise Database** | Open Exercise Repository adapted from [RepDB](https://repdb.co) (643 exercises) |
| **Nutrition Databases** | [Open Food Facts](https://world.openfoodfacts.org/) API + Bundled USDA FoodData Central whole foods dataset |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) with AsyncStorage local persistence |
| **Styling & Design** | Sleek Cyber-Athletic Dark Mode (`#080B10`), HSL accents, and glassmorphic micro-components |
| **Icons** | [Lucide React Native](https://lucide.dev/) |

---

## 📱 App Navigation & Modules

### 1. 💬 Coach (`CoachChatScreen`)
- Real-time conversational AI coaching with live tokens-per-second streaming metrics.
- Synchronized with active wearable telemetry (HRV, resting heart rate, sleep duration, calorie burn) and **today's logged nutrition totals & remaining macros**.
- Horizontal micro-prompt chips (`HorizontalChipBar`) adapting dynamically to your equipment mode and goals:
  - *Gym Mode*: Adjust macros, Bench cues, Compound overload plans, Readiness review.
  - *Home Mode*: Adjust macros, Bodyweight form cues, Skill progression checks, Readiness review.

### 2. 🥗 Nutrition (`NutritionScreen`)
- **Macro Progress Header**: Real-time calorie gauge, remaining energy budget, and progress bars for Protein, Carbs, Fat, and Dietary Fiber.
- **Micronutrient Bio-Profile Scorecard**: Expandable RDA tracker for Vitamins (A, C, D, B12) and Minerals (Iron, Calcium, Magnesium, Potassium, Sodium limit, Zinc).
- **Meal Sections**: Structured daily tracking across Breakfast, Lunch, Dinner, and Snacks.
- **Log Food Modal**:
  - *Database Search*: Search whole foods (USDA) and packaged products (Open Food Facts).
  - *Barcode Scanner*: Scan barcodes or enter codes with instant OFF product lookup.
  - *Snap / AI Decomposer*: Snap a photo or describe composite meals (e.g. "2 eggs, avocado, sourdough") to decompose ingredients with scaled lab nutrients.
  - *Portion Review Sheet*: Adjust grams/servings with real-time nutrient recalculation before logging.

### 3. 🏋️ Workout & Progressions (`ProgressionsScreen`)
- Equipment segmented selector: **Full Gym (All Equipment)** vs. **Bodyweight / Home**.
- Daily Adaptive Workout Card with structured warmups, primary compound/skill lifts, accessory volume, metabolic finishers, and cooldowns.
- Interactive milestone mastery progress trees with one-tap *"Ask Coach"* shortcuts for biomechanical guidance.
- Horizontal scrolling filter chips allowing instant filtering by specific lift or movement category.

### 4. ⚡ Telemetry (`TelemetryScreen`)
- **Dynamic 0–100 Readiness Gauge**: Visualizes Central Nervous System (CNS) recovery and neuromuscular adaptation based on HRV, resting heart rate, sleep duration, and deep sleep architecture.
- **Native OS Health Hub Bridge**: Connects locally to Android Health Connect or Apple HealthKit to read biometrics from all paired wearables (Garmin, Apple Watch, Samsung, Whoop, Oura, Pixel, Xiaomi, Strava) with zero remote API latency and zero cloud logins.
- **Fitness App Sync Guide**: Interactive modal providing native health provider status, permissions management, supported companion app guides, and quick biometric sync.
- **Smart Scale Weight Auto-Sync**: Automatically updates your athlete weight and recalibrates daily nutrition/macro targets whenever a new weigh-in is detected.
- **Biometric Tracking Grid**: Live cards for Sleep Architecture (total + deep sleep), Cardiac Autonomic (RHR + HRV), Active Energy Burned, and Daily Movement steps.
- **Privacy & Storage Controls**: Complete local management with one-tap selective wiping for AI conversations, biometrics, or complete application resets.

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
- **Web Development**: Any modern Chromium or WebKit browser

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

## 🧠 Model Configuration & GGUF Support

When using on-device inference on physical devices:
1. Supported model formats: Quantized `.gguf` files (recommended: `Q4_K_M` or `Q4_0` 2B-3B parameter models such as Google Gemma 2 2B, Qwen 2.5 1.5B/3B, or Llama 3.2 1B/3B).
2. For local network inference, configure your desktop runner (e.g. `ollama run gemma2:2b` or LM Studio local server) and enter your local network IP in **Settings → OpenAI-Compatible Provider**.

---

## 📄 License

ZeroCoach is released under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.
