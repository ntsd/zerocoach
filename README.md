# ZeroCoach

ZeroCoach is an open-source mobile application powered entirely by an on-device AI model. Built with React Native, it delivers highly personalized workout plans and adaptive lifestyle guidance—with zero cloud latency and absolute data privacy.

## ✨ Features

- 📱 On-Device AI Inference: Powered by a fine-tuned, quantized local model (Gemma 2) running directly on your phone's hardware via llama.rn. No cloud APIs, no data mining, works completely offline.

- 🎯 Adaptive Coaching Modes: Toggle between Strict mode (structured athlete programming) or Comfortable mode (sustainable daily health).

- 💬 Interactive Chat Interface: Get real-time, dynamic guidance on everything from adjusting daily macros to progressing your physical training (e.g., L-sit and Muscle-up progressions).

- ⌚ Wearable Telemetry Sync: Pulls fitness data locally from Google Fit, Garmin, and Xiaomi integrations into a unified dashboard.

- ⚡ Over-The-Air (OTA) Updates: Built-in CodePush integration ensures users receive immediate UI and prompt-logic hotfixes without waiting for App Store approvals.

## 🏗️ Architecture & Tech Stack

ZeroCoach is built for high-performance edge inference and seamless cross-platform deployment.

- Frontend Framework: React Native (TypeScript).

- AI Inference Engine: llama.rn (React Native bindings for llama.cpp) utilizing GGUF quantization (Q4_K_M) for fast, low-memory inference using device Metal/OpenCL acceleration.

- State Management: Zustand with AsyncStorage persistence for lightweight chat history, telemetry handling, and local model states.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Android SDK (for physical device / emulator builds) or Web browser for instant preview

### Installation

```bash
# Clone the repository
git clone https://github.com/ntsd/zerocoach.git
cd zerocoach

# Install dependencies
npm install
```

### Running the App

```bash
# Start the Expo development server
npm start

# Run on Android (via Expo Dev Client / emulator)
npm run android

# Instant browser preview
npm run web
```

## 📱 App Navigation & Features

- **Coach**: Interactive AI chat with dynamic context injection, streaming token feedback, and persona toggling.
- **Telemetry**: Physiological readiness score gauge (0-100), sleep/cardiac/caloric cards, and testing presets.
- **Skills**: Calisthenics progression tracker for L-Sit (Stages 1-5) and Bar Muscle-Up (Stages 1-5) with direct coach review shortcuts.
- **AI Engine**: On-device Gemma 2 GGUF model manager, Metal/OpenCL acceleration indicators, and rapid simulation fallback mode.

## 📜 License

ZeroCoach is released under the Apache License 2.0.
