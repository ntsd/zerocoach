import { AGENT_TOOLS } from './tools';
import { executeTool, normalizeToolName, inferMealTypeFromCurrentTime } from './dispatcher';
import {
  ToolCall,
  ToolResult,
  AgentExecutionStep,
  AgentExecutionCallbacks,
  DomainName,
  ToolAccessType,
} from './types';
import { classifyUserIntent, ALL_DOMAINS } from './intentRouter';
import { llmService } from '@/services/llm/llmService';
import { CompletionRequest, CompletionResult } from '@/services/llm/types';
import { isNegationOrRecoveryStatement, inferCategoryFromContent } from '@/services/memory/memoryEngine';

const MAX_TOOL_CALLS = 4;

interface ScopedToolDef {
  domain: DomainName;
  line: string;
}

const COMPACT_TOOL_CATALOG: ScopedToolDef[] = [
  {
    domain: 'memory',
    line: 'save_memory(content): Save lasting athlete fact, equipment owned, favorite/disliked foods, allergies, injuries, or coaching preference.',
  },
  {
    domain: 'memory',
    line: 'remove_memory(idOrQuery): Forget/delete outdated memory by ID, topic, or keyword.',
  },
  {
    domain: 'food_history',
    line: 'log_food_item(name, consumedGrams, calories, proteinGrams, carbsGrams, fatGrams, date): Log food to diary. Meal time auto-inferred from clock.',
  },
  {
    domain: 'food_database',
    line: 'search_food_database(query, source): Search USDA / OpenFoodFacts when nutrition lookup is needed.',
  },
  {
    domain: 'workout_plan',
    line: 'update_workout_plan(title, split, exercises, date): Create or update workout routine.',
  },
  {
    domain: 'workout_plan',
    line: 'swap_plan_exercise(targetExerciseNameOrId, replacementExerciseNameOrId, date): Swap an exercise in the plan.',
  },
  {
    domain: 'workout_plan',
    line: 'manage_workout_schedule(action, splitCycle, date): action="skip_workout" | "reschedule_next" | "set_cycle".',
  },
  {
    domain: 'workout_history',
    line: 'log_completed_workout(title, exercises, durationMinutes, rpe, notes, date): Log completed workout or set.',
  },
  {
    domain: 'workout_database',
    line: 'search_exercises(query, muscleGroup): Search RepDB movement library for exercise technique, cues, biomechanics, or progression.',
  },
  {
    domain: 'settings',
    line: 'update_user_settings(dailyCalorieTarget, proteinGrams, weightKg, heightCm, equipmentPreference, skillLevel): Update athlete profile and nutrition target settings.',
  },
];

/**
 * Builds an intent-scoped tool declaration block (~75–140 tokens).
 * Includes ambient memory tools unconditionally alongside matched domain tools.
 */
export function buildScopedAgentToolPrompt(activeDomains: DomainName[] = ALL_DOMAINS): string {
  const domains = new Set<DomainName>(activeDomains);
  // Ambient memory invariant
  domains.add('memory');

  const selectedTools = COMPACT_TOOL_CATALOG.filter((t) => domains.has(t.domain));
  const toolLines = selectedTools.map((t, idx) => `${idx + 1}. ${t.line}`).join('\n');

  let dynamicExamples = '';
  if (domains.has('food_history')) {
    dynamicExamples += `
- When the athlete wants to log food or a meal:
<tool_call>
{"name": "log_food_item", "arguments": {"name": "Grilled Chicken Breast", "consumedGrams": 200, "calories": 330, "proteinGrams": 62}}
</tool_call>`;
  }
  if (domains.has('workout_history')) {
    dynamicExamples += `
- When the athlete reports completing an exercise, sets, reps, or finished workout:
<tool_call>
{"name": "log_completed_workout", "arguments": {"title": "Push-up Session", "exercises": [{"name": "Push-up", "sets": 2, "reps": "10 reps"}]}}
</tool_call>`;
  }
  if (domains.has('workout_plan')) {
    dynamicExamples += `
- When the athlete wants to swap or change an exercise:
<tool_call>
{"name": "swap_plan_exercise", "arguments": {"targetExerciseNameOrId": "Push-up", "replacementExerciseNameOrId": "Incline Dumbbell Press"}}
</tool_call>`;
  }

  return `
[AGENT TOOLS — SCOPED TOOLS]
${toolLines}

PROTOCOL:
- Live telemetry, today's workout, and stored memories are ALREADY in ATHLETE CONTEXT above.
- When the athlete states NEW equipment they own, favorite foods/skills, new injuries, or preferences, call save_memory with the NEW fact:
<tool_call>
{"name": "save_memory", "arguments": {"content": "I don't eat shrimp"}}
</tool_call>
- When the athlete states they are NOT/NO LONGER allergic (e.g. "I don't allergic to shrimp", "not allergic to shrimp", "no shrimp allergy"), healed from injury ("shoulder is healed"), don't have equipment anymore, or asks to forget/remove a memory (e.g. "remove that I don't like shrimp", "forget that"), you MUST call remove_memory:
<tool_call>
{"name": "remove_memory", "arguments": {"idOrQuery": "shrimp"}}
</tool_call>${dynamicExamples}
- In save_memory, ALWAYS use the athlete's exact words from their CURRENT message. NEVER repeat past memories or examples.
- To call a tool, start your response directly with <tool_call>.
- If no tool is needed, reply normally without <tool_call> tags.`;
}

/**
 * Backward-compatible full-catalog tool prompt generator.
 */
export function buildAgentToolPrompt(): string {
  return buildScopedAgentToolPrompt(ALL_DOMAINS);
}

function tryExtractToolCall(jsonStr: string): ToolCall | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    const rawName = parsed.name || parsed.tool || parsed.action;
    if (typeof rawName !== 'string') return null;

    const normalizedName = normalizeToolName(rawName);
    const isKnownTool = AGENT_TOOLS.some((t) => t.name === normalizedName);
    if (!isKnownTool) return null;

    let rawArgs = parsed.arguments ?? parsed.parameters ?? parsed.args ?? parsed.action_input;
    if (typeof rawArgs === 'string') {
      try {
        rawArgs = JSON.parse(rawArgs);
      } catch {
        rawArgs = {};
      }
    }

    // Support flat tool call objects where small models place parameters at the top level alongside "name"
    if (!rawArgs || typeof rawArgs !== 'object') {
      const topLevelArgs: Record<string, any> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (k !== 'name' && k !== 'tool' && k !== 'action') {
          topLevelArgs[k] = v;
        }
      }
      rawArgs = topLevelArgs;
    }

    return {
      id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: normalizedName,
      arguments: rawArgs,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts a tool call from LLM output text.
 * Robustly parses:
 * 1. <tool_call>...</tool_call> tags
 * 2. ```json ... ``` markdown code blocks
 * 3. Raw or embedded JSON objects with "name" and "arguments"
 */
export function parseToolCallFromText(text: string): ToolCall | null {
  if (!text) return null;

  // 1. Try explicit <tool_call> tags (including when </tool_call> was consumed as a stop sequence)
  const xmlMatch = text.match(/<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/i);
  if (xmlMatch) {
    const call = tryExtractToolCall(xmlMatch[1].trim());
    if (call) return call;
  }

  // 2. Try markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (codeBlockMatch) {
    const call = tryExtractToolCall(codeBlockMatch[1].trim());
    if (call) return call;
  }

  // 3. Scan for any JSON object containing "name", "tool", or "action"
  let startIndex = 0;
  while ((startIndex = text.indexOf('{', startIndex)) !== -1) {
    const preview = text.slice(startIndex, startIndex + 150);
    if (!/"(?:name|tool|action)"\s*:/i.test(preview)) {
      startIndex++;
      continue;
    }

    let depth = 0;
    let endIndex = -1;
    let inString = false;
    let escape = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
    }

    if (endIndex !== -1) {
      const jsonCandidate = text.slice(startIndex, endIndex);
      const call = tryExtractToolCall(jsonCandidate);
      if (call) return call;
      startIndex = endIndex;
    } else {
      break;
    }
  }

  return null;
}

const WORD_TO_NUMBER: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function parseWordOrNumber(val: string | undefined, fallback: number = 1): number {
  if (!val) return fallback;
  const cleaned = val.trim().toLowerCase();
  return WORD_TO_NUMBER[cleaned] ?? (isNaN(parseFloat(cleaned)) ? fallback : parseFloat(cleaned));
}

/**
 * Intercepts plain-text fake confirmations emitted by small on-device models
 * (e.g. "✅ **Saved to Coach Memory:** ...", "Saved to Coach Memory: ...", "Memory saved: ...")
 * and synthesizes the corresponding ToolCall so execution and persistence actually run.
 */
export function extractSyntheticToolCall(text: string, lastUserMsg: string = ''): ToolCall | null {
  if (!text) return null;
  const clean = text.trim();

  // 1. Synthetic remove_memory detection
  const removePatterns = [
    /(?:✅\s*)?(?:\*\*)?(?:Removed|Deleted|Forgotten|Cleared) (?:from )?(?:Coach )?Memory:?(?:\*\*)?\s*(.+)?/i,
    /(?:✅\s*)?(?:\*\*)?Memory (?:removed|deleted|forgotten|cleared):?(?:\*\*)?\s*(.+)?/i,
    /(?:✅\s*)?(?:\*\*)?(?:I have |I've )?(?:removed|deleted|forgotten|cleared) (?:that|this|the memory):?(?:\*\*)?\s*(.+)?/i,
    /(?:ลบ|ลืม)ความจำ(?:เรียบร้อย|แล้ว)?:?\s*(.+)?/i,
  ];

  for (const pat of removePatterns) {
    const match = clean.match(pat);
    if (match) {
      const targetQuery = (match[1] || '').trim() || lastUserMsg;
      return {
        id: `synth-remove-${Date.now()}`,
        name: 'remove_memory',
        arguments: {
          idOrQuery: targetQuery,
        },
      };
    }
  }

  // 2. Synthetic save_memory detection
  const savePatterns = [
    /(?:✅\s*)?(?:\*\*)?Saved to (?:Coach )?Memory:?(?:\*\*)?\s*(.+)?/i,
    /(?:✅\s*)?(?:\*\*)?(?:Added to|Stored in) (?:Coach )?Memory:?(?:\*\*)?\s*(.+)?/i,
    /(?:✅\s*)?(?:\*\*)?Memory saved:?(?:\*\*)?\s*(.+)?/i,
    /(?:✅\s*)?(?:\*\*)?(?:I have |I've )?(?:saved|remembered|stored) (?:that|this|to memory):?(?:\*\*)?\s*(.+)?/i,
    /(?:บันทึก|จำ)(?:ความจำ|ข้อมูล)(?:เรียบร้อย|แล้ว)?:?\s*(.+)?/i,
  ];

  for (const pat of savePatterns) {
    const match = clean.match(pat);
    if (match) {
      const extractedContent = (match[1] || '').trim() || lastUserMsg;

      // Inverted action protection: If the athlete explicitly asked to remove/forget or stated negation/recovery,
      // but the model emitted fake "Saved to Coach Memory", redirect to remove_memory!
      if (isNegationOrRecoveryStatement(lastUserMsg) || isNegationOrRecoveryStatement(extractedContent)) {
        return {
          id: `synth-remove-${Date.now()}`,
          name: 'remove_memory',
          arguments: {
            idOrQuery: extractedContent || lastUserMsg,
          },
        };
      }

      return {
        id: `synth-save-${Date.now()}`,
        name: 'save_memory',
        arguments: {
          category: inferCategoryFromContent(extractedContent),
          topic: 'user_preference',
          content: extractedContent,
        },
      };
    }
  }

  // 3. Synthetic log_completed_workout detection
  // e.g. '✅ **Logged workout: Push-up (2 sets, 10 reps)**'
  // e.g. '- **Current Status**: You\'ve completed 10 reps of push-ups in two sets.'
  // e.g. 'You completed 10 reps of push-ups in 2 sets.'
  // e.g. '✅ บันทึกการซ้อมเรียบร้อย: Push-up 2 เซ็ต 10 ครั้ง'
  const isWorkoutConfirmation =
    /(?:workout|session|exercise|sets?|reps?|เซ็ต|ครั้ง|การซ้อม|การออกกำลังกาย)/i.test(clean);

  const explicitWorkoutLogMatch = isWorkoutConfirmation
    ? clean.match(/(?:✅\s*)?(?:\*\*)?(?:Logged|Recorded)\s+(?:workout|session|exercise)?:?\s*["']?([^"'\n]+)/i) ||
      clean.match(/(?:✅\s*)?(?:\*\*)?(?:Workout|Exercise)\s+(?:logged|recorded):?\s*["']?([^"'\n]+)/i) ||
      clean.match(/(?:✅\s*)?(?:\*\*)?(?:I have |I've )?(?:logged|recorded) (?:your )?(?:workout|exercise|session):?\s*["']?([^"'\n]+)/i) ||
      clean.match(/(?:✅\s*)?(?:\*\*)?(?:บันทึกการซ้อม|บันทึกการออกกำลังกาย)(?:เรียบร้อย|แล้ว)?:?\s*["']?([^"'\n]+)/i)
    : null;

  const completedWorkoutAckMatch =
    clean.match(/(?:completed|finished)\s+(\w+)\s*reps?\s+(?:of\s+)?([\w\s-]+?)\s+(?:in|for|,)\s+(\w+)\s*sets?/i) ||
    clean.match(/(?:completed|finished)\s+(\w+)\s*sets?\s+(?:of\s+)?(\w+)\s*reps?\s+(?:of\s+)?([\w\s-]+)/i);

  if (explicitWorkoutLogMatch || completedWorkoutAckMatch) {
    let exerciseName = 'Workout';
    let sets = 1;
    let reps = '10 reps';

    if (completedWorkoutAckMatch) {
      const matchText = completedWorkoutAckMatch[0].toLowerCase();
      const isRepsFirst = matchText.indexOf('rep') < matchText.indexOf('set');
      if (isRepsFirst) {
        reps = `${parseWordOrNumber(completedWorkoutAckMatch[1], 10)} reps`;
        exerciseName = completedWorkoutAckMatch[2].trim();
        sets = parseWordOrNumber(completedWorkoutAckMatch[3], 1);
      } else {
        sets = parseWordOrNumber(completedWorkoutAckMatch[1], 1);
        reps = `${parseWordOrNumber(completedWorkoutAckMatch[2], 10)} reps`;
        exerciseName = completedWorkoutAckMatch[3].trim();
      }
    } else if (explicitWorkoutLogMatch) {
      const details = explicitWorkoutLogMatch[1] || '';
      const setsMatch = details.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:sets?|เซ็ต)/i);
      const repsMatch = details.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:reps?|ครั้ง)/i);
      if (setsMatch) sets = parseWordOrNumber(setsMatch[1], 1);
      if (repsMatch) reps = `${parseWordOrNumber(repsMatch[1], 10)} reps`;
      const namePart = details
        .replace(/\([^)]*\)/g, '')
        .replace(/[*_#`]/g, '')
        .replace(/\b(?:workout|exercise|session)\b/gi, '')
        .replace(/^[:\-–—\s]+|[:\-–—\s]+$/g, '')
        .trim();
      if (namePart) exerciseName = namePart;
    }

    if (lastUserMsg) {
      const userSets = lastUserMsg.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:sets?|เซ็ต)/i);
      const userReps = lastUserMsg.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:reps?|ครั้ง)/i);
      const userExercise = lastUserMsg.match(/\b(push[\s-]?ups?|pull[\s-]?ups?|squats?|bench(?:\s*press)?|deadlifts?|curls?|lunges?|dips?|planks?)\b/i);

      if (userSets && sets === 1) sets = parseWordOrNumber(userSets[1], 1);
      if (userReps && reps === '10 reps') reps = `${parseWordOrNumber(userReps[1], 10)} reps`;
      if (userExercise && (exerciseName === 'Workout' || exerciseName.length < 3)) {
        exerciseName = userExercise[1].trim();
      }
    }

    exerciseName = exerciseName.charAt(0).toUpperCase() + exerciseName.slice(1);

    return {
      id: `synth-workout-${Date.now()}`,
      name: 'log_completed_workout',
      arguments: {
        title: `${exerciseName} Session`,
        exercises: [
          {
            name: exerciseName,
            sets,
            reps,
          },
        ],
      },
    };
  }

  // 4. Synthetic log_food_item detection
  // e.g. '✅ **Logged "Cornbread" (450g, 1197 kcal, 30.2g protein, 195.8g carbs, 32g fat) to lunch**'
  // e.g. 'Logged "Salmon" (100g, 235 kcal, 24g protein) to lunch'
  const foodLogMatch = !isWorkoutConfirmation
    ? clean.match(
        /(?:✅\s*)?(?:\*\*)?(?:Logged|Recorded|Added)\s+["']?([^"'(]+)["']?\s*(?:\(([^)]+)\))?\s*(?:to\s+(\w+))?/i
      )
    : null;
  if (foodLogMatch) {
    const foodName = foodLogMatch[1].trim();
    const details = foodLogMatch[2] || '';
    const mealType = (foodLogMatch[3] ? foodLogMatch[3].toLowerCase() : inferMealTypeFromCurrentTime()) as string;

    const gramsMatch = details.match(/(\d+(?:\.\d+)?)\s*g(?:rams?)?(?!\s*(?:protein|carb|fat))/i);
    const caloriesMatch = details.match(/(\d+(?:\.\d+)?)\s*(?:kcal|calories)\b/i);
    const proteinMatch = details.match(/(\d+(?:\.\d+)?)\s*g\s*protein\b/i);
    const carbsMatch = details.match(/(\d+(?:\.\d+)?)\s*g\s*carbs?\b/i);
    const fatMatch = details.match(/(\d+(?:\.\d+)?)\s*g\s*fat\b/i);

    const consumedGrams = gramsMatch ? parseFloat(gramsMatch[1]) : 100;
    const calories = caloriesMatch ? parseFloat(caloriesMatch[1]) : 0;
    const proteinGrams = proteinMatch ? parseFloat(proteinMatch[1]) : 0;
    const carbsGrams = carbsMatch ? parseFloat(carbsMatch[1]) : 0;
    const fatGrams = fatMatch ? parseFloat(fatMatch[1]) : 0;

    return {
      id: `synth-food-${Date.now()}`,
      name: 'log_food_item',
      arguments: {
        name: foodName,
        consumedGrams,
        calories,
        proteinGrams,
        carbsGrams,
        fatGrams,
        mealType,
      },
    };
  }

  return null;
}

/**
 * Finds domain and access type for a tool
 */
function getToolMeta(toolName: string): { domain: DomainName; access: ToolAccessType } {
  const normalized = normalizeToolName(toolName);
  const def = AGENT_TOOLS.find((t) => t.name === normalized || t.name === toolName);
  return {
    domain: def?.domain || 'settings',
    access: def?.access || 'read',
  };
}

export function cleanFinalResponseText(text: string): string {
  return text
    .replace(/^\s*\(?no text before(?: <tool_call>)?\)?\s*/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<\/?tool_call>/gi, '')
    .replace(/<tool_result>[\s\S]*?<\/tool_result>/gi, '')
    .replace(/<\/?tool_result>/gi, '')
    .replace(/```(?:json)?\s*\{[\s\S]*?"(?:name|tool|action)"[\s\S]*?\}\s*```/gi, '')
    .trim();
}

export interface AgentRunParams {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  callbacks?: AgentExecutionCallbacks;
  temperature?: number;
  maxTokens?: number;
  mediaPaths?: string[];
}

export interface AgentRunResult {
  fullText: string;
  steps: AgentExecutionStep[];
  tokensGenerated: number;
  tokensPerSecond: number;
  contextTokensUsed?: number;
  contextMaxTokens?: number;
}

function formatDeterministicWriteConfirmation(
  call: ToolCall,
  result: ToolResult,
  leadingText?: string
): string {
  let cleanLeading = leadingText ? cleanFinalResponseText(leadingText) : '';
  if (/^\(?no text before/i.test(cleanLeading)) {
    cleanLeading = '';
  }
  // Strip duplicate fake confirmations from leading text if present
  cleanLeading = cleanLeading
    .replace(/(?:✅\s*)?(?:\*\*)?(?:Logged|Recorded|Added|Saved to|Removed from|Forgot).*?(?:\*\*|$)\n*/gi, '')
    .trim();

  const primaryConfirmation =
    call.name === 'save_memory'
      ? `✅ **Saved to Coach Memory:** ${call.arguments?.content || result.summary}`
      : `✅ **${result.summary}**`;

  if (cleanLeading && cleanLeading.length > 8) {
    return `${primaryConfirmation}\n\n${cleanLeading}`;
  }

  return primaryConfirmation;
}

  export function isTargetUpdateAccidentalOnMealInquiry(
    toolName: string,
    userMsg: string,
    toolArgs?: Record<string, any>
  ): boolean {
    if (!userMsg) return false;
    if (toolName !== 'update_daily_macro_targets' && toolName !== 'update_user_settings') return false;
    if (toolName === 'update_user_settings' && !toolArgs?.dailyCalorieTarget && !toolArgs?.proteinGrams) {
      return false;
    }
    const userMsgLower = userMsg.toLowerCase();
    const isExplicitTargetUpdateRequest =
      /\b(update|change|set|adjust|modify|reset)\b.*\b(target|goal|calorie|protein|macro)\b/i.test(
        userMsgLower
      ) || /เปลี่ยน|ตั้งค่า|ปรับ.*(เป้าหมาย|แคล|โปรตีน)/.test(userMsgLower);

    const isMealInquiry =
      /\b(what|suggest|recommend|eat|meal|food|portion|recipe)\b/i.test(userMsgLower) ||
      /แนะนำ|ทานอะไร|กินอะไร|ควรทาน|เมนู/.test(userMsgLower);

    return !isExplicitTargetUpdateRequest && isMealInquiry;
  }

  export class AgentHarness {
    /**
     * Runs the agent harness loop: handles reasoning, tool execution, and final synthesis
     */
    public static async run(params: AgentRunParams): Promise<AgentRunResult> {
      const { systemPrompt, messages, callbacks, temperature = 0.1, maxTokens = 400 } = params;

      const isOnDevice = llmService.getProvider() === 'on_device';
      // Dynamically scope tools based on detected user intent (~75–140 tokens)
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      const activeDomains = classifyUserIntent(lastUserMessage, messages);
      const augmentedSystemPrompt = `${systemPrompt}\n${buildScopedAgentToolPrompt(activeDomains)}`;
      const synthesisSystemPrompt = `${systemPrompt}\n\n[DATA RETRIEVED: Answer the athlete's question concisely using the <tool_result> data above. Do NOT output <tool_call> tags.]`;
      const conversationHistory = [...messages];
      const steps: AgentExecutionStep[] = [];
      let totalTokens = 0;
      let finalTokensPerSecond = 0;
      let lastContextTokensUsed: number | undefined;
      let lastContextMaxTokens: number | undefined;
      let toolCallsCount = 0;

      while (toolCallsCount < MAX_TOOL_CALLS) {
        let iterationStreamedText = '';

        const activeSysPrompt =
          toolCallsCount > 0 ? synthesisSystemPrompt : augmentedSystemPrompt;

        const completionResult: CompletionResult = await llmService.streamCompletion(
          {
            systemPrompt: activeSysPrompt,
            messages: conversationHistory,
            temperature,
            maxTokens: isOnDevice ? Math.min(maxTokens, 320) : maxTokens,
            mediaPaths: toolCallsCount === 0 ? params.mediaPaths : undefined,
          },
          (token: string) => {
            iterationStreamedText += token;
            // Only stream tokens directly to user if not emitting a tool call structure
            const trimmedSoFar = iterationStreamedText.trimStart();
            const isToolCallEmitting =
              trimmedSoFar.startsWith('<tool_call') ||
              trimmedSoFar.startsWith('{"name"') ||
              trimmedSoFar.startsWith('{"tool"') ||
              trimmedSoFar.startsWith('{"action"') ||
              trimmedSoFar.startsWith('```');

            if (!isToolCallEmitting) {
              callbacks?.onToken?.(token);
            }
          }
        );

        totalTokens += completionResult.tokensGenerated;
        finalTokensPerSecond = completionResult.tokensPerSecond || finalTokensPerSecond;
        lastContextTokensUsed = completionResult.contextTokensUsed || lastContextTokensUsed;
        lastContextMaxTokens = completionResult.contextMaxTokens || lastContextMaxTokens;

        const outputText = completionResult.fullText.trim();
        const lastUserMsg =
          [...conversationHistory].reverse().find((m) => m.role === 'user')?.content || '';
        let detectedCall = parseToolCallFromText(outputText);

        // Synthetic Tool Call Interception Fallback:
        // If small on-device LLM outputted plain-text confirmation instead of <tool_call>,
        // intercept and synthesize the corresponding ToolCall so SQLite persistence actually happens!
        if (!detectedCall) {
          detectedCall = extractSyntheticToolCall(outputText, lastUserMsg);
        }

        // If no tool was called (and no synthetic call was intercepted), this is the final response to the user
        if (!detectedCall) {
          const cleanFinalText = cleanFinalResponseText(outputText);

          return {
            fullText: cleanFinalText,
            steps,
            tokensGenerated: totalTokens,
            tokensPerSecond: finalTokensPerSecond,
            contextTokensUsed: lastContextTokensUsed,
            contextMaxTokens: lastContextMaxTokens,
          };
        }

        // Inverted action protection: If athlete explicitly expressed negation or recovery
        // (e.g. "I don't allergic to shrimp", "not allergic to shrimp", "healed from knee pain")
        // but the model invoked save_memory, intercept and redirect to remove_memory.
        if (detectedCall.name === 'save_memory' && isNegationOrRecoveryStatement(lastUserMsg)) {
          const rawContent = String(
            detectedCall.arguments?.content ||
            detectedCall.arguments?.topic ||
            detectedCall.arguments?.idOrQuery ||
            ''
          );
          detectedCall.name = 'remove_memory';
          detectedCall.arguments = {
            idOrQuery: rawContent || lastUserMsg,
          };
        } else if (detectedCall.name === 'save_memory' && lastUserMsg) {
          // Hallucinated content correction for save_memory:
          // If the model invoked save_memory but copied an irrelevant past memory/example
          // instead of the user's current message, align content to user's statement!
          const rawContent = String(detectedCall.arguments?.content || '').toLowerCase();
          const userMsgLower = lastUserMsg.toLowerCase();
          const userTokens = userMsgLower.split(/[\s,.;:!?]+/).filter((w) => w.length > 3);
          const hasOverlap = userTokens.some((t) => rawContent.includes(t));
          const expressesFactOrPreference =
            /\b(like|love|hate|dislike|prefer|favorite|eat|diet|allergy|allergic|own|bought|have|pain|hurt|injury)\b/i.test(
              userMsgLower
            ) || /ชอบ|ไม่ชอบ|รัก|แพ้|กิน|ซื้อ|มี|เจ็บ|ปวด/.test(userMsgLower);

          if (!hasOverlap && expressesFactOrPreference) {
            detectedCall.arguments = {
              category: inferCategoryFromContent(lastUserMsg),
              topic: 'user_preference',
              content: lastUserMsg,
            };
          }
        } else if (detectedCall.name === 'log_food_item' && lastUserMsg) {
          // Alignment for log_food_item:
          const rawName = String(detectedCall.arguments?.name || '').toLowerCase();
          const userMsgLower = lastUserMsg.toLowerCase();

          // 1. Attached photo alignment: If a meal photo was identified in the prompt context,
          // align food name and macro nutrients with the photo's verified analysis
          const photoMatch = lastUserMsg.match(
            /\[ATTACHED PHOTO IDENTIFIED:\s*"([^"]+)"(?:\s*\([^)]*\))?\s*\|\s*Portion:\s*(\d+)g\s*\|\s*Nutrition:\s*(\d+)\s*kcal,\s*(\d+(?:\.\d+)?)\s*g\s*protein,\s*(\d+(?:\.\d+)?)\s*g\s*carbs,\s*(\d+(?:\.\d+)?)\s*g\s*fat/i
          );
          if (photoMatch) {
            detectedCall.arguments.name = photoMatch[1].trim();
            if (
              !detectedCall.arguments.consumedGrams ||
              detectedCall.arguments.consumedGrams === 100 ||
              detectedCall.arguments.consumedGrams === 200
            ) {
              detectedCall.arguments.consumedGrams = parseFloat(photoMatch[2]) || 100;
            }
            if (!detectedCall.arguments.calories || detectedCall.arguments.calories === 330) {
              detectedCall.arguments.calories = parseFloat(photoMatch[3]) || 0;
              detectedCall.arguments.proteinGrams = parseFloat(photoMatch[4]) || 0;
              detectedCall.arguments.carbsGrams = parseFloat(photoMatch[5]) || 0;
              detectedCall.arguments.fatGrams = parseFloat(photoMatch[6]) || 0;
            }
          } else if (rawName.includes('chicken') && !userMsgLower.includes('chicken')) {
            // 2. Text message alignment: If model parroted "chicken" from the prompt example
            const foodExtract = lastUserMsg.match(
              /(?:ate|eat|eating|had|have|consumed|log|logging|logged)\s+(?:(?:around|about|approx(?:\.)?|some|a|an|\d+(?:\.\d+)?\s*(?:g|grams?|oz|pieces?|servings?|bowls?|plates?))\s+(?:of\s+)?)?([^,.;!?\n]+?)(?:\s+(?:for|at)\s+(?:breakfast|lunch|dinner|snack)|$)/i
            );
            if (foodExtract && foodExtract[1]) {
              detectedCall.arguments.name = foodExtract[1].trim();
            }
          }
        } else if (isTargetUpdateAccidentalOnMealInquiry(detectedCall.name, lastUserMsg, detectedCall.arguments)) {
          // Accidental target update protection: If the athlete is asking what to eat or for food recommendations,
          // but did not explicitly ask to change their macro targets, block the tool call and synthesize food options.
          conversationHistory.push({
            role: 'assistant',
            content: `I will not change your daily targets. Here are the best meals to hit your remaining budget:`,
          });
          conversationHistory.push({
            role: 'user',
            content: `[SYSTEM: Do NOT call update_daily_macro_targets. Recommend specific whole-food meals and portions matching the athlete's remaining caloric and protein budget.]`,
          });
          continue;
        }

        // Tool Call Detected!
        toolCallsCount++;
        const meta = getToolMeta(detectedCall.name);
        const stepId = `step-${Date.now()}-${toolCallsCount}`;
        const runningStep: AgentExecutionStep = {
          id: stepId,
          toolName: detectedCall.name,
          domain: meta.domain,
          access: meta.access,
          status: 'running',
          summary: `Executing ${detectedCall.name.replace(/_/g, ' ')}...`,
          timestamp: Date.now(),
        };

        steps.push(runningStep);
        callbacks?.onStepUpdate?.(runningStep);

        // Execute tool against local stores and services
        const toolResult: ToolResult = await executeTool(detectedCall);

        // Update step status
        runningStep.status = toolResult.success ? 'completed' : 'failed';
        runningStep.summary = toolResult.summary;
        callbacks?.onStepUpdate?.({ ...runningStep });

        // FAST DETERMINISTIC PATH FOR WRITE TOOLS:
        // When a write action (save_memory, log_food_item, manage_workout_schedule, etc.) succeeds,
        // return an instant deterministic confirmation with 0 extra LLM passes!
        if (meta.access === 'write' && toolResult.success) {
          const preToolText = outputText.split('<tool_call>')[0]?.trim();
          const confirmationText = formatDeterministicWriteConfirmation(
            detectedCall,
            toolResult,
            preToolText
          );
          callbacks?.onToken?.(confirmationText);
          return {
            fullText: confirmationText,
            steps,
            tokensGenerated: totalTokens,
            tokensPerSecond: finalTokensPerSecond,
            contextTokensUsed: lastContextTokensUsed,
            contextMaxTokens: lastContextMaxTokens,
          };
        }

        // Append assistant tool call and tool result to conversation context for next iteration
        conversationHistory.push({
          role: 'assistant',
          content: `<tool_call>\n${JSON.stringify({
            name: detectedCall.name,
            arguments: detectedCall.arguments,
          })}\n</tool_call>`,
        });

        const rawResultStr = JSON.stringify(
          toolResult.success ? toolResult.data : { error: toolResult.error }
        );
        const compactResultStr =
          isOnDevice && rawResultStr.length > 800
            ? `${rawResultStr.slice(0, 800)}... (summary: ${toolResult.summary})`
            : rawResultStr;

        conversationHistory.push({
          role: 'user',
          content: `<tool_result>\n${compactResultStr}\n</tool_result>\nTool execution completed (${toolResult.summary}). Now write your concise coaching response for the athlete.`,
        });
      }

      // If max tool calls were reached without a final text response turn,
      // ALWAYS run a final synthesis pass so the athlete receives their full coaching response!
      conversationHistory.push({
        role: 'user',
        content: `[SYSTEM: All data retrievals and tool actions are completed. Synthesize your final, comprehensive, structured coaching answer to the athlete's request based on all the data above. Do NOT call any more tools or output <tool_call> tags.]`,
      });

      let synthesisStreamedText = '';
      const synthesisResult: CompletionResult = await llmService.streamCompletion(
        {
          systemPrompt: synthesisSystemPrompt,
          messages: conversationHistory,
          temperature,
          maxTokens: isOnDevice ? 350 : Math.max(maxTokens, 800),
          mediaPaths: params.mediaPaths,
        },
        (token: string) => {
          synthesisStreamedText += token;
          if (!synthesisStreamedText.includes('<tool_call>')) {
            callbacks?.onToken?.(token);
          }
        }
      );

      totalTokens += synthesisResult.tokensGenerated;
      finalTokensPerSecond = synthesisResult.tokensPerSecond || finalTokensPerSecond;
      lastContextTokensUsed = synthesisResult.contextTokensUsed || lastContextTokensUsed;
      lastContextMaxTokens = synthesisResult.contextMaxTokens || lastContextMaxTokens;

      const cleanFinalText = cleanFinalResponseText(synthesisResult.fullText);

      return {
        fullText:
          cleanFinalText ||
          (steps.length > 0
            ? `Completed actions: ${steps.map((s) => s.summary).join('; ')}`
            : 'Action completed. Please check your updated dashboard.'),
        steps,
        tokensGenerated: totalTokens,
        tokensPerSecond: finalTokensPerSecond,
        contextTokensUsed: lastContextTokensUsed,
        contextMaxTokens: lastContextMaxTokens,
      };
    }
  }

