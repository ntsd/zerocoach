import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';

/**
 * SimulatorEngine delivers realistic token-by-token streaming emulation
 * reflecting on-device quantized Gemma 2 performance (~35 tokens/sec).
 * It dynamically evaluates the injected telemetry and persona context.
 */
export class SimulatorEngine implements LLMEngine {
  private abortRequested: boolean = false;
  private ready: boolean = true;

  public async initialize(_modelPath?: string): Promise<boolean> {
    this.ready = true;
    return true;
  }

  public isReady(): boolean {
    return this.ready;
  }

  public stopCompletion(): void {
    this.abortRequested = true;
  }

  public async unload(): Promise<void> {
    this.ready = false;
  }

  public async streamCompletion(
    request: CompletionRequest,
    onToken: TokenCallback
  ): Promise<CompletionResult> {
    this.abortRequested = false;
    const startTime = Date.now();

    const lastUserMessage =
      request.messages[request.messages.length - 1]?.content.toLowerCase() || '';
    const isStrict = request.systemPrompt.includes('STRICT ATHLETE MODE');

    // Extract readiness score from prompt
    const readinessMatch = request.systemPrompt.match(/Daily Readiness Score: (\d+)\/100/);
    const readiness = readinessMatch ? parseInt(readinessMatch[1], 10) : 75;

    // Generate response text tailored to telemetry and intent
    const responseText = this.generateResponseContent({
      prompt: lastUserMessage,
      isStrict,
      readiness,
      systemPrompt: request.systemPrompt,
    });

    // Split into natural token chunks (words and punctuation)
    const tokens = responseText.match(/(\s+|[^\s]+)/g) || [responseText];
    let emitted = '';

    for (let i = 0; i < tokens.length; i++) {
      if (this.abortRequested) {
        break;
      }
      const token = tokens[i];
      emitted += token;
      onToken(token);

      // Simulates Gemma 2 2B Q4_K_M latency (approx 20-30ms per word chunk)
      await new Promise((resolve) => setTimeout(resolve, 22));
    }

    const durationMs = Math.max(1, Date.now() - startTime);
    const tokenCount = tokens.length;
    const tokensPerSecond = Number(((tokenCount / durationMs) * 1000).toFixed(1));

    return {
      fullText: emitted,
      tokensGenerated: tokenCount,
      tokensPerSecond,
      durationMs,
    };
  }

  private generateResponseContent(params: {
    prompt: string;
    isStrict: boolean;
    readiness: number;
    systemPrompt: string;
  }): string {
    const { prompt, isStrict, readiness } = params;

    // 1. MACRO / NUTRITION QUERY
    if (prompt.includes('macro') || prompt.includes('calorie') || prompt.includes('protein') || prompt.includes('diet') || prompt.includes('food')) {
      if (isStrict) {
        return `### 🥩 STRICT MACRO TARGETS (Readiness ${readiness}/100)

Based on your current physiological expenditure and readiness baseline:

• **Caloric Target:** Maintain 2,800 kcal baseline.
• **Protein:** 175g (2.1g/kg) — prioritize leucine threshold (3g+ per meal from whey, lean steak, chicken breast).
• **Carbohydrates:** 320g — concentrated pre- and post-workout to replenish glycogen stores.
• **Fats:** 65g — healthy monounsaturated & omega-3 fats for hormonal regulation.

**Telemetry Impact:** Your active burn is calibrated. If performing calisthenics skill work today, consume 40g rapid-digesting carbs 35 mins pre-session.

**YOUR MOVE:** Log each meal within 5g accuracy today. No unmeasured snacking.`;
      } else {
        return `### 🥗 Mindful Nutrition & Macro Balance

Taking your current readiness score of **${readiness}/100** into account, here is a sustainable nutrition gameplan for today:

• **Protein Priority:** Aim for ~150-165g of protein spread comfortably across 3-4 meals to support muscle repair.
• **Whole Energy:** Focus on colorful veggies, sweet potatoes, oats, and fruits to keep energy steady without blood sugar crashes.
• **Hydration & Electrolytes:** Aim for 2.5 to 3 liters of water. If you feel tired, add a pinch of sea salt or lemon to your morning glass.

Listen to your natural satiety cues today. Nourish your body to recover and feel energized!`;
      }
    }

    // 2. CALISTHENICS / L-SIT / MUSCLE-UP QUERY
    if (prompt.includes('l-sit') || prompt.includes('muscle-up') || prompt.includes('calisthenic') || prompt.includes('skill') || prompt.includes('progression')) {
      if (isStrict) {
        if (readiness < 60) {
          return `### ⚠️ READINESS ALERT: DELOAD SKILL PROTOCOL (Readiness ${readiness}/100)

Your CNS readiness is depressed (${readiness}/100). Max-effort dynamic attempts today will reinforce poor motor patterns and elevate tendinopathy risk.

**Mandatory Adjustments:**
• **L-Sit:** Substitute full hold with *Seated Compression Knee Lifts*: 3 sets of 10 controlled reps, 2s hold at apex.
• **Scapular Mechanics:** 4 sets of 12 *Active Scapular Pull-Downs* on bar (no elbow bending, pure lat depression).
• **Core Stability:** Hollow body hold: 3 sets of 25 seconds.

**YOUR MOVE:** Execute strict 90s rest intervals. Terminate set if form breaks down by even 5%.`;
        } else {
          return `### ⚡ HIGH-INTENSITY CALISTHENICS PROTOCOL (Readiness ${readiness}/100)

Readiness is primed at **${readiness}/100**. Today is the day to push kinetic chain progression.

**1. L-Sit Progression (Stage 2: Advanced Tuck on Parallettes)**
• 4 sets of 15-20s holds.
• *Mechanical Cues:* Drive palms down with maximum scapular depression. Keep knees locked tight to chest, toes actively pointed, pelvis tucked forward.

**2. Muscle-Up Transition Mechanics**
• 4 sets of 3 explosive chest-to-bar pull-ups with violent hip drive.
• Focus on the transit over the bar: lean chest aggressively over the bar at the apex.

**YOUR MOVE:** Record your second set on video to evaluate hip height. Rest 2.5 minutes between holds.`;
        }
      } else {
        return `### 🤸 Calisthenics Movement Practice

Your readiness today is sitting at **${readiness}/100**. Let's build strength while keeping your joints happy!

• **L-Sit Foundation:** Try 3 easy sets of supported tuck holds on parallettes or chairs for 10-15 seconds. If that feels intense, keep your feet lightly touching the floor for balance.
• **Shoulder Prep:** Gentle hanging from a bar with active shoulders for 20 seconds. It decompresses the spine and builds grip naturally.
• **Mindset:** Focus on smooth breathing rather than holding your breath.

Take plenty of rest between sets and celebrate the micro-gains!`;
      }
    }

    // 3. RECOVERY / SLEEP / READINESS QUERY
    if (prompt.includes('recovery') || prompt.includes('sleep') || prompt.includes('readiness') || prompt.includes('tired') || prompt.includes('heart rate')) {
      if (readiness >= 80) {
        return `### 🔋 READINESS ANALYSIS: PEAK RECOVERY (${readiness}/100)

Your physiological indicators are exceptional:
• **Parasympathetic Balance:** Elevated HRV and steady resting heart rate demonstrate complete neuromuscular adaptation.
• **Tissue Repair:** Deep sleep stages were sufficient for cellular restoration and growth hormone secretion.

**Programming Directive:** You have full green light for maximum volume, heavy pull sessions, or skill PR attempts today.`;
      } else if (readiness >= 60) {
        return `### ⚖️ READINESS ANALYSIS: MODERATE STATE (${readiness}/100)

Your system is functional but requires disciplined energy budgeting:
• Sleep duration was adequate, but resting heart rate is slightly elevated (+3-4 bpm above optimal baseline).
• Maintain planned workout volume, but avoid going to absolute failure on final sets.
• Prioritize 10 minutes of post-session mobility and active diaphragmatic breathing.`;
      } else {
        return `### 🛑 READINESS ANALYSIS: ELEVATED STRAIN / FATIGUE (${readiness}/100)

Critical metrics indicate inadequate recovery:
• Depressed sleep quality score combined with elevated resting heart rate indicates sympathetic nervous system dominance.
• Heavy loading today will accumulate systemic fatigue without eliciting productive hypertrophy or skill gains.

**Action Plan:** Deload session recommended. Take a 30-minute brisk walk, hydrate with minerals, and prioritize being in bed by 10:30 PM.`;
      }
    }

    // 4. GENERAL / WORKOUT QUERY
    if (isStrict) {
      return `### 🎯 ZEROCOACH DIRECTIVE (Readiness: ${readiness}/100 | STRICT MODE)

Analyzing your current training cycle and biometric status:

1. **Session Focus:** Calisthenics strength endurance & posterior chain alignment.
2. **Readiness Calibration:** At ${readiness}/100, we adapt the training volume accordingly.
3. **Daily Accountability:** Ensure your 170g protein baseline is met before 8:00 PM.

What specific exercise or progression do you need broken down right now?`;
    } else {
      return `### 👋 ZeroCoach Daily Check-In (Readiness: ${readiness}/100)

Welcome back! I'm here to support your health journey today.

• With your readiness at **${readiness}/100**, today is all about mindful momentum.
• Whether you want to practice some bodyweight movements, adjust your meals, or take an active recovery walk, I'm here to guide you.

How is your body feeling right now, and what would you like to focus on today?`;
    }
  }
}
