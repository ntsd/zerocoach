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
- 🥗 **Smart Nutrition & Physiological Metas**: Calculates precision BMR (Mifflin-St Jeor), Total Daily Energy Expenditure (TDEE), and macro splits based on biological sex, body weight, height, wearable calorie burn, and primary training goals.
- ⚡ **Dual Coaching Personas**:
  - **Strict Coach**: High-intensity, uncompromising athletic conditioning focused on progressive overload, kinetic chain alignment, and accountability.
  - **Comfort Coach**: Sustainable, empathetic habit-building focused on longevity, recovery pacing, and joint health.
- ⌚ **Local Wearable Telemetry Sync**: Integrates with local bridges for Google Fit, Garmin, Xiaomi, and Health Connect, plus built-in physiological presets (Optimal, Fatigued, High-Load, Rest Day) for instant simulation.
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
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) with AsyncStorage local persistence |
| **Styling & Design** | Sleek Cyber-Athletic Dark Mode (`#080B10`), HSL accents, and glassmorphic micro-components |
| **Icons** | [Lucide React Native](https://lucide.dev/) |

---

## 📱 App Navigation & Modules

### 1. 💬 Coach (`CoachChatScreen`)
- Real-time conversational AI coaching with live tokens-per-second streaming metrics.
- Synchronized with active wearable telemetry (HRV, resting heart rate, sleep duration, calorie burn).
- Horizontal micro-prompt chips (`HorizontalChipBar`) adapting dynamically to your equipment mode and goals:
  - *Gym Mode*: Adjust macros, Bench cues, Compound overload plans, Readiness review.
  - *Home Mode*: Adjust macros, Bodyweight form cues, Skill progression checks, Readiness review.

### 2. ⚡ Telemetry (`TelemetryScreen`)
- Dynamic 0–100 Readiness Gauge visualizing Central Nervous System (CNS) recovery and physiological readiness.
- Biometric tracking cards: Sleep duration, Resting Heart Rate (RHR), and Wearable Active Burn.
- Rapid Simulation Presets: Test coaching behavior across *Optimal CNS (92/100)*, *Fatigued (48/100)*, *High Metabolic (82/100)*, and *Rest & Recovery (35/100)*.

### 3. 🏋️ Workout & Progressions (`ProgressionsScreen`)
- Equipment segmented selector: **Full Gym (All Equipment)** vs. **Bodyweight / Home**.
- Daily Adaptive Workout Card with structured warmups, primary compound/skill lifts, accessory volume, metabolic finishers, and cooldowns.
- Interactive milestone mastery progress trees with one-tap *"Ask Coach"* shortcuts for biomechanical guidance.
- Horizontal scrolling filter chips allowing instant filtering by specific lift or movement category.

### 4. ⚙️ Settings & Engine (`ModelManagerScreen`)
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
