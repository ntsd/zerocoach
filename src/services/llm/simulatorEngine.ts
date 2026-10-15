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

    // 2. GYM COMPOUND LIFTS (BENCH, SQUAT, ROW, DEADLIFT)
    if (
      prompt.includes('bench') ||
      prompt.includes('squat') ||
      prompt.includes('row') ||
      prompt.includes('deadlift') ||
      prompt.includes('compound')
    ) {
      if (isStrict) {
        return `### 🏋️ COMPOUND LIFT BIOMECHANICAL DIRECTIVE (Readiness ${readiness}/100)

Readiness calibrated at **${readiness}/100**. Biomechanical standards for today's primary compound execution:

**1. Barbell Bench Press & Horizontal Mechanics:**
• *Scapular Setup:* Retract and depress scapulae firmly into the bench pad to establish an unyielding foundation.
• *Bar Path:* Touch slightly below the nipple line at the sternum; press back in an efficient diagonal arc toward the rack.
• *Leg Drive:* Drive heels into the floor at set initialization to stabilize pelvis and prevent energy bleed.
• *Cadence:* 3-second controlled eccentric descent, 0.5s pause, explosive concentric press (${readiness >= 80 ? 'RPE 8.5' : 'RPE 7.5'}).

**2. Progressive Overload Directive:**
• Today's Scheme: Target 3–4 working sets at prescribed RPE. If all reps are completed with clean bar speed, increment load by 2.5 kg next session.

**YOUR MOVE:** Set safety catches before load initialization. Rest 90–120s between work sets.`;
      } else {
        return `### 🏋️ Compound Exercise Form & Guidance

Your readiness today is **${readiness}/100**. Here are key cues to make your gym session smooth and joint-friendly:

• **Set Up Your Foundation:** Keep your feet planted firmly, engage your core with a natural breath, and focus on moving with steady rhythm.
• **Control The Descent:** Lower weights with control (2-3 seconds) and press smoothly without rushing or locking out abruptly.
• **Listen to Your Joints:** Stop 1-2 reps before fatigue affects your posture. Smooth reps build lifelong joint resilience!

Enjoy your session and take restful pauses between sets!`;
      }
    }

    // 3. PROGRESSION & OVERLOAD QUERY
    if (prompt.includes('progression') || prompt.includes('overload') || prompt.includes('load')) {
      if (isStrict) {
        return `### ⚡ PROGRESSION & OVERLOAD PROTOCOL (Readiness ${readiness}/100)

${
  readiness >= 80
    ? `Readiness is primed at **${readiness}/100** (High CNS drive). Green light for progressive overload:
• **Primary Lifts:** Add 1 rep to each working set or increment load by 2–2.5%.
• **Double Progression Model:** Hit top of rep bracket (e.g. 8 reps on all sets) before increasing resistance.
• **RPE Ceiling:** RPE 8.5–9. Keep 1 clean rep in reserve.`
    : readiness >= 60
    ? `Readiness is balanced at **${readiness}/100**. Maintain planned loading:
• **Volume Directive:** Perform prescribed baseline sets (RPE 7.5–8). Do not force extra reps to failure.
• **Tempo Quality:** Focus on explosive bar acceleration and controlled eccentrics.`
    : `Readiness is depressed at **${readiness}/100**. Autoregulated deload active:
• **Volume Reduction:** Cut total sets by 35% and drop weight to 70% of working load.
• **CNS Protection:** Zero sets taken past RPE 6. Protect connective tissue.`
}

**YOUR MOVE:** Log each set and adhere strictly to designated rest intervals.`;
      } else {
        return `### 🌱 Progression & Steady Growth (Readiness ${readiness}/100)

With today's readiness at **${readiness}/100**, the secret to progress is steady, sustainable momentum:

• **Quality Over Load:** If you feel strong, add a repetition or slightly increase weight while keeping movement smooth.
• **Rest When Needed:** Take generous rest intervals (60–90 seconds) so every set feels energized and rewarding.
• **Celebrate Consistency:** Showing up and moving with good form is the ultimate foundation for long-term health!`;
      }
    }

    // 4. CALISTHENICS / BODYWEIGHT QUERY (Explicitly asked)
    if (prompt.includes('l-sit') || prompt.includes('muscle-up') || prompt.includes('calisthenic') || prompt.includes('bodyweight')) {
      if (isStrict) {
        if (readiness < 60) {
          return `### ⚠️ READINESS ALERT: DELOAD BODYWEIGHT PROTOCOL (Readiness ${readiness}/100)

Your CNS readiness is depressed (${readiness}/100). Max-effort dynamic attempts today will elevate tendinopathy risk.

**Mandatory Adjustments:**
• **Push/Pull Mechanics:** 3 sets of 12 controlled push-ups or inverted rows, focusing on full range of motion.
• **Core Stability:** 3 sets of 25s hollow body hold or plank.
• **Rest:** 60s between sets. Avoid ballistic kipping or max holds.

**YOUR MOVE:** Terminate set if form breaks down by even 5%.`;
        } else {
          return `### ⚡ BODYWEIGHT STRENGTH & SKILL PROTOCOL (Readiness ${readiness}/100)

Readiness is primed at **${readiness}/100**. Target upper body kinetic chain mastery:

**1. Primary Push / Pull Progression:**
• 4 sets of 6–8 strict pull-ups or deep dips.
• *Mechanical Cues:* Full dead-hang to chest-to-bar contact. Zero kipping, full scapular engagement.

**2. Core & Isometric Holds:**
• 4 sets of 15-20s compression holds with pointed toes and active scapular depression.

**YOUR MOVE:** Record your working set on video to evaluate joint alignment. Rest 2 minutes between holds.`;
        }
      } else {
        return `### 🤸 Bodyweight Movement Practice

Your readiness today is sitting at **${readiness}/100**. Let's build strength while keeping your joints happy!

• **Push & Pull Foundation:** Try 3 easy sets of push-ups and supported rows within your comfortable range.
• **Core & Posture:** Gentle planks and compression stretches to decompress the spine and build stability.
• **Mindset:** Focus on smooth breathing rather than straining.

Take plenty of rest between sets and celebrate the micro-gains!`;
      }
    }

    // 5. RECOVERY / SLEEP / READINESS QUERY
    if (prompt.includes('recovery') || prompt.includes('sleep') || prompt.includes('readiness') || prompt.includes('tired') || prompt.includes('heart rate')) {
      if (readiness >= 80) {
        return `### 🔋 READINESS ANALYSIS: PEAK RECOVERY (${readiness}/100)

Your physiological indicators are exceptional:
• **Parasympathetic Balance:** Elevated HRV and steady resting heart rate demonstrate complete neuromuscular adaptation.
• **Tissue Repair:** Deep sleep stages were sufficient for cellular restoration and growth hormone secretion.

**Programming Directive:** You have full green light for maximum volume, heavy compound sessions, or progressive overload PRs today.`;
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

    // 6. GENERAL / WORKOUT QUERY
    if (isStrict) {
      return `### 🎯 ZEROCOACH DIRECTIVE (Readiness: ${readiness}/100 | STRICT MODE)

Analyzing your current training cycle and biometric status:

1. **Session Focus:** Targeted strength progression & kinetic chain alignment.
2. **Readiness Calibration:** At ${readiness}/100, we adapt the training volume accordingly.
3. **Daily Accountability:** Ensure your prescribed daily protein baseline is met before 8:00 PM.

What specific exercise, lift, or macro targets do you need broken down right now?`;
    } else {
      return `### 👋 ZeroCoach Daily Check-In (Readiness: ${readiness}/100)

Welcome back! I'm here to support your health journey today.

• With your readiness at **${readiness}/100**, today is all about mindful momentum.
• Whether you want to do a gym session, practice some bodyweight movements, or adjust your meals, I'm here to guide you.

How is your body feeling right now, and what would you like to focus on today?`;
    }
  }
}
