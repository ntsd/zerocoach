import { CompletionRequest, CompletionResult, LLMEngine, TokenCallback } from './types';

interface GenerationContext {
  prompt: string;
  isStrict: boolean;
  readiness: number;
  isThai: boolean;
  athleteName: string;
  remainingKcal?: number;
  remainingProtein?: number;
  activeGoal?: string;
}

/**
 * SimulatorEngine delivers realistic token-by-token streaming emulation
 * when on-device GGUF weights are downloading or offline without a remote API.
 * It deeply evaluates biometric telemetry, language preferences (Thai / EN),
 * and athlete context to provide genuine sports science coaching.
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
      request.messages[request.messages.length - 1]?.content || '';
    const cleanPrompt = lastUserMessage.trim();
    const isStrict = request.systemPrompt.includes('STRICT ATHLETE MODE');

    // Detect language: Thai characters presence or language flag
    const hasThaiChars = /[\u0E00-\u0E7F]/.test(cleanPrompt);
    const systemSaysThai = request.systemPrompt.includes('Thai') || request.systemPrompt.includes('ภาษาไทย');
    const isThai = hasThaiChars || systemSaysThai;

    // Extract readiness score from prompt
    const readinessMatch = request.systemPrompt.match(/Daily Readiness Score: (\d+)\/100/i);
    const readiness = readinessMatch ? parseInt(readinessMatch[1], 10) : 75;

    // Extract athlete name if present
    const nameMatch = request.systemPrompt.match(/Athlete Name:\s*([^\n\r]+)/i);
    const athleteName = nameMatch ? nameMatch[1].trim() : 'Athlete';

    // Extract nutrition remaining targets
    const kcalMatch = request.systemPrompt.match(/Remaining Calories:\s*(\d+)/i);
    const remainingKcal = kcalMatch ? parseInt(kcalMatch[1], 10) : undefined;

    const proteinMatch = request.systemPrompt.match(/Remaining Protein:\s*(\d+)g/i);
    const remainingProtein = proteinMatch ? parseInt(proteinMatch[1], 10) : undefined;

    // Extract primary goal
    const goalMatch = request.systemPrompt.match(/Primary Training Focus:\s*([^\n\r]+)/i);
    const activeGoal = goalMatch ? goalMatch[1].trim() : undefined;

    const responseText = this.generateResponseContent({
      prompt: cleanPrompt,
      isStrict,
      readiness,
      isThai,
      athleteName,
      remainingKcal,
      remainingProtein,
      activeGoal,
    });

    // Split into natural token chunks
    const tokens = responseText.match(/(\s+|[^\s]+)/g) || [responseText];
    let emitted = '';

    for (let i = 0; i < tokens.length; i++) {
      if (this.abortRequested) {
        break;
      }
      const token = tokens[i];
      emitted += token;
      onToken(token);

      // Simulates realistic quantized model streaming speed (~35-40 tok/s)
      await new Promise((resolve) => setTimeout(resolve, 20));
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

  private generateResponseContent(ctx: GenerationContext): string {
    const p = ctx.prompt.toLowerCase();
    const { isStrict, readiness, isThai, athleteName, remainingKcal, remainingProtein } = ctx;

    // 1. GREETING / WHO ARE YOU / STATUS CHECK
    const isGreeting =
      p.includes('hello') ||
      p.includes('hi ') ||
      p === 'hi' ||
      p.includes('hey') ||
      p.includes('who are you') ||
      p.includes('สวัสดี') ||
      p.includes('หวัดดี') ||
      p.includes('ดีครับ') ||
      p.includes('ดีค่ะ') ||
      p.includes('เป็นใคร');

    if (isGreeting) {
      if (isThai) {
        return `### ⚡ ZeroCoach ยินดีต้อนรับ ${athleteName !== 'Athlete' ? athleteName : ''}

คะแนนความพร้อมวันนี้อยู่ที่ **${readiness}/100** ${
          readiness >= 80 ? '(พร้อมสำหรับการฝึกหนัก)' : readiness >= 60 ? '(พร้อมระดับปานกลาง)' : '(ควรเน้นการฟื้นฟู)'
        }

ผมพร้อมช่วยคุณวิเคราะห์:
• **แผนการฝึกซ้อม:** จัดโปรแกรมและปรับน้ำหนักฝึกตามคะแนนความพร้อม
• **โภชนาการ:** คำนวณมื้ออาหารตามสารอาหารที่ยังขาด (${remainingKcal ? `เหลืออีก ${remainingKcal} kcal` : 'ติดตามแคลอรี่'})
• **เทคนิคการฝึก (Form Cues):** แนะนำการเคลื่อนไหวที่ปลอดภัยตามหลักชีวกลศาสตร์

วันนี้คุณต้องการเริ่มที่เรื่องการฝึกหรือโภชนาการดีครับ?`;
      }

      return `### ⚡ ZeroCoach Ready • Athlete Status

Welcome, ${athleteName}. Your Daily Readiness is currently **${readiness}/100** ${
        readiness >= 80 ? '(Optimal Adaptation)' : readiness >= 60 ? '(Moderate Baseline)' : '(Recovery Required)'
      }.

I am ready to assist you with:
• **Adaptive Training:** Workouts calibrated to today's neurological readiness.
• **Precision Macros:** Targeted meals to hit your remaining nutrient targets ${
        remainingProtein ? `(${remainingProtein}g protein remaining)` : ''
      }.
• **Biomechanical Form Cues:** Compound lifts & calisthenics skill progressions.

What would you like to execute or calibrate right now?`;
    }

    // 2. NUTRITION & FOOD
    const isNutrition =
      p.includes('food') ||
      p.includes('eat') ||
      p.includes('macro') ||
      p.includes('calorie') ||
      p.includes('protein') ||
      p.includes('carb') ||
      p.includes('diet') ||
      p.includes('snack') ||
      p.includes('กิน') ||
      p.includes('อาหาร') ||
      p.includes('แคล') ||
      p.includes('โปรตีน') ||
      p.includes('มื้อ');

    if (isNutrition) {
      const targetKcal = remainingKcal || (isStrict ? 650 : 550);
      const targetProtein = remainingProtein || 45;

      if (isThai) {
        return `### 🥗 คำแนะนำโภชนาการอัจฉริยะ (ความพร้อม: ${readiness}/100)

จากเป้าหมายประจำวันของคุณ ${remainingKcal ? `(ยังเหลืออีก **${remainingKcal} kcal** และโปรตีน **${targetProtein}g**)` : ''}:

**มื้ออาหารที่แนะนำ:**
1. **โปรตีนคุณภาพสูง:** อกไก่ย่าง 200g หรือ ปลาแซลมอน/ทูน่า 180g (โปรตีน ~42g)
2. **คาร์โบไฮเดรตเชิงซ้อน:** ข้าวกล้อง 1 ถ้วย หรือ มันหวานนึ่ง 150g (คาร์บ ~40g)
3. **ผักและแร่ธาตุ:** บรอกโคลีลวกหรือผักโขม 1 ถ้วย เพื่อเติมโพแทสเซียมและแมกนีเซียม

${
  isStrict
    ? '⚠️ **ข้อควรระวัง (Strict Mode):** ชั่งน้ำหนักอาหารก่อนปรุง และหลีกเลี่ยงซอสที่มีน้ำตาลแฝงเกิน 5g'
    : '💡 **คำแนะนำ:** ทานให้อิ่มพอดี ดื่มน้ำตาม 1-2 แก้ว เพื่อการดูดซึมและสังเคราะห์โปรตีนกล้ามเนื้ออย่างสมบูรณ์'
}`;
      }

      return `### 🥩 Targeted Nutrition Protocol (Readiness: ${readiness}/100)

Calibrated for your remaining daily targets (~${targetKcal} kcal | ~${targetProtein}g protein):

**Recommended Recovery Meal:**
• **Primary Protein:** 200g Grilled Chicken Breast or 180g Wild Salmon (~42g protein).
• **Complex Glycogen Replenishment:** 1.5 cups Jasmine/Brown Rice or 200g Sweet Potato (~45g carbs).
• **Bio-Mineral Vegetables:** 1 cup Steamed Broccoli & Asparagus (high potassium & micronutrient density).

${
  isStrict
    ? '**STRICT DIRECTIVE:** Weigh portions raw/cooked consistently. Log entries into the Nutrition Tracker to close your daily macro gap.'
    : '**COACH TIP:** Stay hydrated with at least 500ml water post-meal to support cellular recovery.'
}`;
    }

    // 3. WORKOUT PLAN & TRAINING SPLIT
    const isWorkoutPlan =
      p.includes('plan') ||
      p.includes('workout') ||
      p.includes('routine') ||
      p.includes('split') ||
      p.includes('today') ||
      p.includes('suggest') ||
      p.includes('ฝึก') ||
      p.includes('ตาราง') ||
      p.includes('แผน') ||
      p.includes('โปรแกรม') ||
      p.includes('เล่นอะไร');

    if (isWorkoutPlan) {
      if (isThai) {
        return `### 🏋️ แผนการฝึกประจำวัน (ความพร้อม: ${readiness}/100)

${
  readiness >= 75
    ? 'ความพร้อมอยู่ในเกณฑ์สูง! เหมาะสำหรับการฝึกสร้างพละกำลังและการโอเวอร์โหลดแบบก้าวหน้า'
    : 'ความพร้อมอยู่ในระดับปานกลาง ควบคุมปริมาณเซ็ตให้กระชับและไม่ฝึกจนหมดแรงเกินไป (RPE 7-8)'
}

**โครงสร้างเซสชันวันนี้:**
1. **ท่าหลัก (Compound):** สควอท หรือ เบนช์เพรส — 3-4 เซ็ต × 6-8 ครั้ง (พัก 90-120 วินาที)
2. **ท่าเสริม (Accessory):** ดัมเบลโรว์ หรือ โอเวอร์เฮดเพรส — 3 เซ็ต × 8-10 ครั้ง
3. **บอดี้เวท / แกนกลาง:** ดึงข้อ หรือ ดิปส์ + แพลงก์ — 3 เซ็ตตามจำนวนครั้งเป้าหมาย

คุณสามารถกดแท็บ **"ฝึกซ้อม"** ด้านล่างเพื่อดูและเริ่มบันทึกเซ็ตตามคลัง RepDB ได้ทันที`;
      }

      return `### 🏋️ Daily Workout Blueprint (Readiness: ${readiness}/100)

${
  readiness >= 75
    ? 'High readiness detected. Your nervous system is primed for progressive overload.'
    : 'Moderate readiness. Maintain disciplined rest intervals and avoid training to absolute failure (RPE 7.5).'
}

**Prescribed Session Scheme:**
1. **Primary Compound:** Barbell Squat or Bench Press — 3-4 sets × 6-8 reps (90-120s rest).
2. **Kinetic Support:** Barbell/Dumbbell Row — 3 sets × 8-10 reps (scapular retract focus).
3. **Bodyweight / Core:** Dips or Pull-ups + Hollow Body Holds — 3 sets to target milestone.

Open the **Workout** tab to review the exact exercise sequence from the RepDB science catalog.`;
    }

    // 4. EXERCISE FORM & CUES (BENCH, SQUAT, DEADLIFT, PULL-UP, PUSH-UP)
    const isForm =
      p.includes('bench') ||
      p.includes('squat') ||
      p.includes('deadlift') ||
      p.includes('pull up') ||
      p.includes('push up') ||
      p.includes('dip') ||
      p.includes('form') ||
      p.includes('cue') ||
      p.includes('ท่า') ||
      p.includes('ฟอร์ม') ||
      p.includes('ดึงข้อ') ||
      p.includes('วิดพื้น') ||
      p.includes('สควอท');

    if (isForm) {
      if (isThai) {
        return `### 🎯 เทคนิคชีวกลศาสตร์การเคลื่อนไหว (Biomechanical Form)

**หลักการจัดระเบียบร่างกายสำคัญ:**
• **การเกร็งแกนกลาง (Bracing):** สูดลมหายใจเข้าลึกผ่านกะบังลม เกร็งหน้าท้องเหมือนเตรียมรับแรงกระแทก ก่อนเริ่มเคลื่อนไหวทุกครั้ง
• **การล็อกสะบัก (Scapular Retraction & Depression):** ดึงสะบักลงและบีบเข้าหากันเพื่อสร้างฐานที่มั่นคง ปกป้องข้อต่อหัวไหล่
• **จังหวะการเคลื่อนไหว (Tempo):** คุมจังหวะลง 2-3 วินาที (Eccentric) หยุดนิ่งมั่นคง 0.5 วินาที แล้วออกแรงดันกลับอย่างเฉียบคม

สามารถกดดูรูปสาธิตฟอร์มแบบ GIF/Pose 3 มิติได้ในหน้ารายละเอียดท่าฝึกในแท็บ **"ฝึกซ้อม"** ครับ`;
      }

      return `### 🎯 Biomechanical Precision Cues

**Key Joint Alignment Directives:**
• **Intra-Abdominal Bracing:** Inhale diaphragmatically 360°, brace core rigidly before eccentric descent.
• **Scapular Packing:** Retract and depress scapulae down toward back pockets to stabilize glenohumeral joint.
• **Kinetic Bar Path:** Control eccentric descent (2-3s tempo), pause at biomechanical inflection, drive explosively.

Detailed start and peak contraction poses for each movement are available in the **Workout** exercise inspector.`;
    }

    // 5. RECOVERY, SLEEP, SORENESS, TIRED
    const isRecovery =
      p.includes('sleep') ||
      p.includes('recovery') ||
      p.includes('tired') ||
      p.includes('fatigue') ||
      p.includes('sore') ||
      p.includes('hurt') ||
      p.includes('rest') ||
      p.includes('hrv') ||
      p.includes('นอน') ||
      p.includes('เมื่อย') ||
      p.includes('ล้า') ||
      p.includes('ปวด') ||
      p.includes('ฟื้นฟู') ||
      p.includes('พัก');

    if (isRecovery) {
      if (isThai) {
        return `### 🌿 แนวทางการฟื้นฟูและการนอนหลับ (คะแนนความพร้อม: ${readiness}/100)

${
  readiness < 65
    ? 'ระบบประสาทอัตโนมัติส่งสัญญาณความล้าสะสม วันนี้ควรให้ความสำคัญกับการฟื้นฟูเป็นอันดับหนึ่ง'
    : 'สถานะการฟื้นตัวอยู่ในเกณฑ์ปกติ ควรรักษาความสม่ำเสมอของเวลาเข้านอน'
}

**เกณฑ์ปฏิบัติคืนนี้:**
1. **สเตจการนอนหลับลึก (Deep Sleep):** หลีกเลี่ยงแสงสีฟ้าจากหน้าจอก่อนนอน 45 นาที และปรับอุณหภูมิห้องให้อยู่ที่ 22-24°C
2. **การคืนความยืดหยุ่น:** ยืดเหยียดเบาๆ 10 นาที เน้นกล้ามเนื้อสะโพก หลังส่วนล่าง และคอ
3. **เกลือแร่และน้ำ:** ดื่มน้ำผสมแมกนีเซียมหรือเกลือแร่เล็กน้อยเพื่อช่วยคลายการหดเกร็งของกล้ามเนื้อ`;
      }

      return `### 🌿 Autonomic Recovery & Sleep Architecture

${
  readiness < 65
    ? 'Elevated sympathetic strain detected. Prioritize central nervous system decompression today.'
    : 'Recovery telemetry is stable. Maintain consistent sleep timing to preserve hormone output.'
}

**Prescribed Tonight:**
• **Deep Sleep Optimization:** Eliminate blue spectrum light 45 min before sleep; bedroom temperature 19–21°C.
• **Parasympathetic Transition:** 10 min diaphragmatic box breathing (4s in, 4s hold, 4s out, 4s hold).
• **Electrolytes:** Ensure sufficient magnesium glycinate and sodium hydration to prevent nocturnal cramps.`;
    }

    // 6. CALISTHENICS & BODYWEIGHT
    const isCalisthenics =
      p.includes('calisthenic') ||
      p.includes('l-sit') ||
      p.includes('muscle up') ||
      p.includes('handstand') ||
      p.includes('planche') ||
      p.includes('lever') ||
      p.includes('bodyweight') ||
      p.includes('บอดี้เวท') ||
      p.includes('คาลิส') ||
      p.includes('ทักษะ');

    if (isCalisthenics) {
      if (isThai) {
        return `### 🤸 แผนพัฒนาทักษะคาลิสเทนิกส์ (Calisthenics Mastery)

**การพัฒนาท่าค้าง (Isometric Holds):**
1. **L-Sit / Tuck L-Sit:** ฝึก 3-4 เซ็ต เซ็ตละ 10-15 วินาที เน้นการกดไหล่ลงสุด (Scapular depression) และเกร็งต้นขา
2. **Pull-up Mastery:** ดึงข้อด้วยฟอร์มตายตัว ไม่แกว่งตัว ดึงหน้าอกเข้าหาบาร์ พัก 90 วินาที
3. **Core Compression:** Hollow Body Hold 30 วินาที × 3 เซ็ต

สะสมเวลารวมที่มีคุณภาพมากกว่าการฝืนค้างจนเสียฟอร์ม ตรวจสอบระดับทักษะในหน้าการฝึกซ้อมได้เลยครับ`;
      }

      return `### 🤸 Calisthenics Progression Blueprint

**Isometric Hold Protocol:**
• **L-Sit / Compression:** 3-4 working sets × 10-15s holds with active scapular depression.
• **Strict Pulling Mechanics:** Chest-to-bar pull-ups with zero kipping; initiate from full dead hang.
• **Hollow Body Integrity:** 3 sets × 30s maintaining lumbar contact with the floor.

Prioritize clean hold density over fatigued repetitions. Check your skill milestones in the **Workout** tab.`;
    }

    // 7. COMPREHENSIVE CONTEXT-DRIVEN ATHLETIC CONSULTATION (CATCH-ALL)
    if (isThai) {
      return `### ⚡ คำแนะนำจากโค้ช ZeroCoach (ความพร้อม: ${readiness}/100)

ยินดีให้คำปรึกษาครับ! จากข้อมูลสรีระและเป้าหมายของคุณในระบบ:

• **สถานะความพร้อมวันนี้:** ${readiness}/100 (${
        readiness >= 75
          ? 'ร่างกายพร้อมสมบูรณ์ สามารถฝึกตามโปรแกรมหลักได้อย่างเต็มที่'
          : 'มีความล้าสะสมเล็กน้อย ควรรักษาระดับ RPE 7-8 และพักให้เพียงพอ'
      })
• **โภชนาการประจำวัน:** ${
        remainingKcal
          ? `ยังเหลือโควตาพลังงานอีก **${remainingKcal} kcal** (${remainingProtein || 40}g โปรตีน)`
          : 'บันทึกมื้ออาหารในแท็บโภชนาการเพื่อดูแคลอรี่ที่เหลือ'
      }

คุณสามารถถามเฉพาะเจาะจงได้ทันที เช่น:
1. *"แนะนำมื้ออาหารคลีนสำหรับแคลอรี่ที่เหลือ"*
2. *"วันนี้ควรเล่นกล้ามเนื้อส่วนไหนดี"*
3. *"ขอเทคนิคท่าเบนช์เพรส / สควอท อย่างละเอียด"*

*(โหมดประมวลผลด่วน: หากต้องการเปิดใช้โมเดลประสาทแบบออฟไลน์เต็มรูปแบบ สามารถไปที่หน้าตั้งค่าเพื่อดาวน์โหลดโมเดลในเครื่อง หรือใส่ Google Gemini API Key ได้ฟรีครับ)*`;
    }

    return `### ⚡ ZeroCoach Athletic Consultation (Readiness: ${readiness}/100)

I am analyzing your athletic parameters and current telemetry state:

• **Readiness Calibration:** At **${readiness}/100**, ${
      readiness >= 75
        ? 'your neuromuscular system is primed for high-output strength and skill work.'
        : 'keep workout volume focused and respect prescribed rest intervals.'
    }
• **Nutrition Status:** ${
      remainingKcal
        ? `You have **${remainingKcal} kcal** remaining today with ~${remainingProtein || 45}g protein needed.`
        : 'Track your meals in the Nutrition tab to calibrate exact targets.'
    }

Try asking me:
1. *"Suggest a dinner to hit my remaining macros"*
2. *"What workout split should I do today?"*
3. *"Give me bench press or squat form cues"*

*(Note: Running local Sovereign Simulator. To unlock full unrestricted local neural weights, download the model in Settings, or add a free Google Gemini API Key for instant cloud intelligence).*`;
  }
}
