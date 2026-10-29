# ZeroCoach System Architecture

ZeroCoach is an open-source, privacy-first mobile fitness and sports science coaching application engineered to run entirely on-device and on local infrastructure.

This document specifies the system architecture of ZeroCoach, detailing the **Symmetric App UI and AI Agent Access Model**, the **Agent Harness Execution Lifecycle**, the **7 Core Architectural Domains**, and **Token-Saving Design Patterns**.

---

## 🏛️ High-Level System Architecture

ZeroCoach establishes **100% symmetric read/write parity** between the direct Mobile App User Interface and the conversational AI Coach. Any action an athlete can perform in the UI (logging food, swapping exercises, adjusting macro targets, viewing biometrics) can also be performed conversationally by the AI Agent via its **Action Harness**, and vice versa.

```mermaid
flowchart TD
    subgraph UI_Layer ["📱 User Interface Layer (React Native + Expo)"]
        UI_Chat["Coach Chat Screen\n(Conversation & Action Feed)"]
        UI_Nutrition["Nutrition Tracker Screen\n(Macros, Food Logs & RDA)"]
        UI_Workout["Adaptive Workout Hub\n(RepDB Kinematics & Calendar)"]
        UI_Analyze["Analyze & Telemetry Screen\n(Biometrics & 0–100 Readiness)"]
        UI_Settings["Settings Screen\n(Engine & Profile Config)"]
    end

    subgraph Agent_Harness ["⚡ AI Agent Mode (Action Harness)"]
        Harness["Agent Harness Coordinator"]
        ToolDispatcher["Tool Execution Dispatcher"]
        ToolRegistry["7-Domain Tool Registry\n(JSON Schemas)"]
        ToolProtocol["Hybrid Tool Protocol\n(Native Tools + Structured Tags)"]
        
        Harness --> ToolRegistry
        Harness --> ToolDispatcher
        ToolProtocol --> Harness
    end

    subgraph LLM_Engines ["🧠 Inference Providers"]
        LLM_OnDevice["On-Device GGUF Engine\n(llama.rn / Metal / NEON)"]
        LLM_OpenAI["OpenAI-Compatible LAN Engine\n(Ollama, LM Studio, vLLM)"]
        LLM_Gemini["Google Gemini Cloud Engine\n(Gemini 2.5 / 3.8 Flash)"]
    end

    subgraph Data_Stores ["💾 Local Reactive State (Zustand + AsyncStorage)"]
        Store_Telemetry["useTelemetryStore\n(Biometrics, Recovery, Stages)"]
        Store_Nutrition["useNutritionStore\n(Food History & Daily Targets)"]
        Store_WorkoutHistory["useWorkoutStore.historyByDate\n(Completed Sessions & Volume)"]
        Store_WorkoutPlan["useWorkoutStore.plansByDate\n(Persistent Workout Plans)"]
        Store_Settings["useCoachStore & useModelStore\n(Profile, Persona, Keys)"]
    end

    subgraph Data_Sources ["🌐 Local & External Databases"]
        DB_USDA["USDA Whole Foods\n(Local Bundled Dataset)"]
        DB_OFF["Open Food Facts API\n(Barcode & Product Database)"]
        DB_RepDB["RepDB Exercise Repository\n(643 Verified Movements)"]
        Bridge_Health["Android Health Connect / Apple HealthKit\n(Direct OS Hardware Sync)"]
    end

    %% UI to Stores
    UI_Nutrition <-->|Read / Write| Store_Nutrition
    UI_Workout <-->|Read / Write| Store_WorkoutPlan
    UI_Workout <-->|Read / Write| Store_WorkoutHistory
    UI_Analyze <-->|Read| Store_Telemetry
    UI_Analyze <-->|Read| Store_WorkoutHistory
    UI_Settings <-->|Read / Write| Store_Settings
    UI_Chat <-->|Interactive Actions| Harness

    %% Harness to Stores
    ToolDispatcher <-->|Read / Write| Store_Telemetry
    ToolDispatcher <-->|Read / Write| Store_Nutrition
    ToolDispatcher <-->|Read / Write| Store_WorkoutHistory
    ToolDispatcher <-->|Read / Write| Store_WorkoutPlan
    ToolDispatcher <-->|Read / Write| Store_Settings

    %% Data Sources Connections
    Store_Telemetry <-->|On-Device Sync| Bridge_Health
    ToolDispatcher -->|Local Query| DB_USDA
    ToolDispatcher -->|REST API| DB_OFF
    ToolDispatcher -->|Local Kinematics| DB_RepDB
    UI_Nutrition --> DB_USDA
    UI_Nutrition --> DB_OFF
    UI_Workout --> DB_RepDB

    %% LLM connections
    UI_Chat <--> LLM_Engines
    Harness <--> LLM_Engines
```

---

## 📊 7-Domain Symmetric Access Parity Matrix

Every domain exposes symmetric capabilities across the mobile interface and the agent harness:

| Domain | App UI Access | AI Agent Harness Access | Primary Store / Service |
|---|---|---|---|
| **1. Fitness Telemetry** | View live Readiness (0–100), HRV, resting HR, sleep architecture, steps, and sync wearables | **Read**: `get_telemetry_metrics()`<br>**Action**: `sync_fitness_telemetry()` | `useTelemetryStore`, `fitnessBridgeService` |
| **2. Food History** | Browse meal logs across calendar dates, log foods to meal sections, delete items, update macro targets | **Read**: `get_food_history()`<br>**Write**: `log_food_item()`, `delete_logged_food()`, `update_daily_macro_targets()` | `useNutritionStore` (`logsByDate`) |
| **3. Food Database** | Search whole foods, query branded packaged products, scan barcodes | **Read**: `search_food_database()`, `get_food_details()` | `openFoodFactsService`, bundled USDA dataset |
| **4. Workout History** | Review past workout sessions, completed sets, movement counts, and volume | **Read**: `get_workout_history()`<br>**Write**: `log_completed_workout()` | `useWorkoutStore` (`historyByDate`) |
| **5. Workout Plan** | View adaptive daily splits, swap movements, skip exercises, schedule future routines | **Read**: `get_workout_plan()`<br>**Write**: `update_workout_plan()`, `swap_plan_exercise()` | `useWorkoutStore` (`plansByDate`) |
| **6. Workout Database (RepDB)** | Browse 643 movements, filter by muscle/equipment, view start/peak pose images & kinetic cues | **Read**: `search_exercises()`, `get_exercise_details()` | `exerciseRepository` (`data/exercises.json`) |
| **7. ZeroCoach Settings** | Update athlete goals, weight, height, equipment preference, skill level, language | **Read**: `get_user_settings()`<br>**Write**: `update_user_settings()` | `useCoachStore`, `useModelStore` |

---

## ⚡ Agent Harness Execution Lifecycle

The Agent Harness acts as an autonomous intermediary between the athlete, the LLM inference engine, and the local reactive state:

```mermaid
sequenceDiagram
    autonumber
    actor Athlete as Athlete (User)
    participant ChatScreen as CoachChatScreen
    participant ChatStore as useChatStore
    participant Harness as AgentHarness
    participant Engine as LLM Service (Gemma 2 / Gemini / Ollama)
    participant Dispatcher as Tool Dispatcher
    participant Stores as Local State & Databases

    Athlete->>ChatScreen: "Log 200g chicken breast to my lunch and swap squats for leg press"
    ChatScreen->>ChatStore: sendMessage(text)
    ChatStore->>Harness: run(params)
    
    Harness->>Engine: Stream prompt with Tool Declarations
    Engine-->>Harness: Stream: <tool_call>{"name":"log_food_item", ...}</tool_call>
    
    Harness->>ChatStore: onStepUpdate: ⚡ "Logging 200g chicken breast to lunch..."
    ChatStore-->>ChatScreen: Render live activity badge in chat
    
    Harness->>Dispatcher: executeTool(log_food_item)
    Dispatcher->>Stores: useNutritionStore.logFood(...)
    Stores-->>Dispatcher: Food logged & macros updated
    Dispatcher-->>Harness: ToolResult: Success (Remaining macros updated)

    Harness->>Engine: Stream prompt with <tool_result> + remaining request
    Engine-->>Harness: Stream: <tool_call>{"name":"swap_plan_exercise", ...}</tool_call>
    
    Harness->>ChatStore: onStepUpdate: ⚡ "Swapping Squats with Leg Press..."
    ChatStore-->>ChatScreen: Update live activity badge
    
    Harness->>Dispatcher: executeTool(swap_plan_exercise)
    Dispatcher->>Stores: useWorkoutStore.swapPlanExercise(...)
    Stores-->>Dispatcher: Plan updated in plansByDate
    Dispatcher-->>Harness: ToolResult: Success (Leg Press swapped)

    Harness->>Engine: Stream prompt with all Tool Results for final synthesis
    Engine-->>Harness: "I've logged 200g of grilled chicken breast (330 kcal, 62g protein) to your lunch, leaving 45g protein for dinner. I also updated today's workout plan to Leg Press with full eccentric control."
    Harness-->>ChatStore: AgentRunResult (fullText, executionSteps)
    ChatStore-->>ChatScreen: Render assistant message with action verification pills
```

### 1. Always-On Autonomous Execution
- No mode toggles or modal interruptions are needed.
- When the athlete asks questions or requests changes, the Agent Harness automatically detects whether tool operations are required.
- Write actions immediately update local state, ensuring the UI reflects modifications without page refreshes.

### 2. Live Activity Status Pills
- While tools are being executed, the UI displays real-time execution pills (`⚡ HARNESS: LOGGING 200G CHICKEN BREAST...`).
- When generation completes, verification pills (`⚡ Logged 200g chicken breast (330 kcal, 62g protein) to lunch`) are attached directly beneath the coach message for transparency.

### 3. Hybrid Multi-Engine Tool Calling Protocol
ZeroCoach runs on diverse hardware profiles with three distinct inference engines:
1. **On-Device GGUF (`llama.rn`)**: Runs quantized models (e.g. Gemma 2 2B/9B, SmolLM) locally on Apple Metal (iOS) and ARM64 NEON (Android). The Agent Harness employs structured `<tool_call>{"name": ..., "arguments": ...}</tool_call>` tag formatting with strict JSON schema definitions in the compact system prompt.
2. **OpenAI-Compatible Local Runners**: Streams from Ollama, LM Studio, or vLLM running on local networks.
3. **Google Gemini API**: Native cloud streaming via Gemini 2.5/3.8 Flash for high-speed multimodal scenarios.

---

## 🎯 Token Optimization Strategy (Saving LLM Tokens)

On-device inference and mobile context windows require conservative token budgets. ZeroCoach implements three architectural optimizations to minimize prompt bloat:

1. **On-Demand Tool Retrieval vs. Context Dumping**:
   - Rather than dumping the entire 7-day workout routine, 643 exercises, and complete food diaries into the system prompt, the baseline prompt contains only high-level summary metrics.
   - When the athlete inquires about workout plans or food items, the LLM calls `get_workout_plan(date)` or `search_food_database(query)` on demand, fetching only the specific payload needed for that turn.
2. **Compact ReAct Schemas**:
   - Tool declarations use concise function signatures (`tool_name(param1, param2): description`) rather than voluminous multi-kilobyte JSON schema definitions on quantized on-device models.
3. **Context Window Compression**:
   - Older assistant conversation turns are truncated to essential highlights (<= 240 chars) to prevent quadratic prefill latency on mobile GPUs.

---

## 🔒 Security & Privacy Sandbox

1. **Local-First Sandboxing**:
   - All athlete biometrics, workout logs, nutrition diaries, and custom plans remain strictly inside the device's sandbox (`AsyncStorage`).
   - No biometric data, personal health records, or chat transcripts are ever transmitted to third-party tracking servers.
2. **Ephemeral Inference**:
   - When using on-device models (`llama.rn`), inference runs entirely in local RAM and GPU shaders with zero network requests.
3. **Hardware Health Isolation**:
   - Connections to Android Health Connect and Apple HealthKit operate via OS-sanctioned permissions and read local device health caches without cloud intermediaries.

