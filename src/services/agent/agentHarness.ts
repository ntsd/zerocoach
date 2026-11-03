import { AGENT_TOOLS } from './tools';
import { executeTool, normalizeToolName } from './dispatcher';
import {
  ToolCall,
  ToolResult,
  AgentExecutionStep,
  AgentExecutionCallbacks,
  DomainName,
  ToolAccessType,
} from './types';
import { llmService } from '@/services/llm/llmService';
import { CompletionRequest, CompletionResult } from '@/services/llm/types';

const MAX_TOOL_CALLS = 4;

/**
 * Builds an ultra-compact (~220 tokens) deterministic tool declaration block
 * containing the 10 core actionable tools. Redundant read tools whose data is
 * already injected in ATHLETE CONTEXT are omitted so tool selection is fast and accurate.
 */
export function buildAgentToolPrompt(): string {
  return `
[AGENT TOOLS — 10 CORE TOOLS]
1. save_memory(category, content, topic): Save lasting athlete fact. category="workout_preference" (equipment, skills, exercises) | "food_preference" (diet, favorite/disliked foods, allergies) | "injury_limitation" (pain/injury) | "personality_style" (coaching tone/schedule).
2. remove_memory(idOrQuery): Forget outdated memory by ID, topic, or keyword.
3. log_food_item(name, mealType, consumedGrams, calories, proteinGrams, carbsGrams, fatGrams, fiberGrams, sugarGrams, date): Log food/meal to diary.
4. search_food_database(query, source): Search USDA / OpenFoodFacts when nutrition lookup is needed.
5. get_food_history(date): Get logged meals & macro totals for a specific date (YYYY-MM-DD).
6. update_daily_macro_targets(targetCalories, targetProtein, targetCarbs, targetFat, targetFiber): Update daily macro targets.
7. update_workout_plan(title, split, exercises, date): Create or update workout routine.
8. swap_plan_exercise(targetExerciseNameOrId, replacementExerciseNameOrId, date): Swap an exercise in the plan.
9. manage_workout_schedule(action, splitCycle, date): action="skip_workout" | "reschedule_next" | "set_cycle".
10. log_completed_workout(title, exercises, durationMinutes, rpe, notes, date): Log completed workout or set.
11. update_user_settings(weightKg, heightCm, dailyCalorieTarget, proteinGrams, equipmentPreference, skillLevel): Update athlete profile settings.

PROTOCOL:
- Live telemetry, today's workout, and stored memories are ALREADY in ATHLETE CONTEXT above.
- Whenever the athlete says "memorize"/"remember" OR states equipment they own (e.g. "I have a pull-up bar"), favorite skills/foods, injuries, or preferences, you MUST call save_memory.
- To call a tool, start your response immediately with <tool_call> (no text before <tool_call>):
<tool_call>
{"name": "save_memory", "arguments": {"category": "workout_preference", "topic": "equipment_pull_up_bar", "content": "Available equipment: Pull-up bar"}}
</tool_call>
- If no tool is needed, reply normally without <tool_call> tags.`;
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
  const cleanLeading = leadingText ? cleanFinalResponseText(leadingText) : '';
  if (cleanLeading && cleanLeading.length > 8) {
    return `${cleanLeading}\n\n✅ **${result.summary}**`;
  }

  switch (call.name) {
    case 'save_memory':
      return `✅ **Saved to Coach Memory:** ${call.arguments?.content || result.summary}`;
    case 'remove_memory':
      return `✅ **Removed from Coach Memory:** ${result.summary}`;
    case 'log_food_item':
      return `✅ **${result.summary}**`;
    case 'delete_logged_food':
      return `✅ **${result.summary}**`;
    case 'update_daily_macro_targets':
      return `✅ **${result.summary}**`;
    case 'update_workout_plan':
    case 'swap_plan_exercise':
    case 'manage_workout_schedule':
    case 'log_completed_workout':
    case 'update_user_settings':
      return `✅ **${result.summary}**`;
    default:
      return `✅ **${result.summary}**`;
  }
}

export class AgentHarness {
  /**
   * Runs the agent harness loop: handles reasoning, tool execution, and final synthesis
   */
  public static async run(params: AgentRunParams): Promise<AgentRunResult> {
    const { systemPrompt, messages, callbacks, temperature = 0.1, maxTokens = 400 } = params;

    const isOnDevice = llmService.getProvider() === 'on_device';
    // Enhance system prompt with compact 10-core-tool declarations (~220 tokens)
    const augmentedSystemPrompt = `${systemPrompt}\n${buildAgentToolPrompt()}`;
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
      const detectedCall = parseToolCallFromText(outputText);

      // If no tool was called, this is the final response to the user
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

