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
 * Builds compact tool declaration prompt block to save LLM tokens
 */
export function buildAgentToolPrompt(): string {
  const toolLines = AGENT_TOOLS.map(
    (t) => `- ${t.name}(${Object.keys(t.parameters.properties).join(', ')}): ${t.description}`
  ).join('\n');

  return `
[AGENT MODE & ACTION HARNESS]
You have real-time read and write tools to the athlete's fitness telemetry, nutrition logs, workout plans, exercise database, and settings:

${toolLines}

TOOL CALLING PROTOCOL & RULES:
1. ATHLETE CONTEXT IS ALREADY LOADED:
   - Live telemetry (Readiness score, sleep, HRV), goals, and today's scheduled workout plan are ALREADY provided in the ATHLETE CONTEXT above.
   - Do NOT call get_telemetry_metrics or get_workout_plan if the data is already present in the ATHLETE CONTEXT. Answer the athlete directly!
2. ONLY call tools when:
   - The athlete requests an ACTION (e.g. "log my food", "save/change this workout plan", "update my goal", "swap an exercise").
   - Detailed external database search is needed (search_food_database, search_exercises) or reading past days history.
3. PROTOCOL:
   - When calling a tool, emit EXACTLY one tool call tag:
<tool_call>
{"name": "tool_name", "arguments": { ... }}
</tool_call>
   - Example to log food:
<tool_call>
{"name": "log_food_item", "arguments": {"name": "Grilled Chicken", "calories": 250, "proteinGrams": 30, "carbsGrams": 0, "fatGrams": 3, "mealType": "lunch"}}
</tool_call>
   - Example to log exercise set or workout:
<tool_call>
{"name": "log_completed_workout", "arguments": {"title": "Pull-up Set", "exercises": [{"name": "Pull-up", "sets": 1, "reps": "10 reps"}]}}
</tool_call>
   - When tool results are provided, synthesize your full coaching answer directly.
   - If no action or tool call is needed, respond normally to the athlete without any <tool_call> tags.
`;
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

    const args = parsed.arguments || parsed.parameters || parsed.args || parsed.action_input || {};

    return {
      id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: normalizedName,
      arguments: typeof args === 'object' && args !== null ? args : {},
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

  // 1. Try explicit <tool_call> tags
  const xmlMatch = text.match(/<tool_call>([\s\S]*?)<\/tool_call>/i);
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
}

export class AgentHarness {
  /**
   * Runs the agent harness loop: handles reasoning, tool execution, and final synthesis
   */
  public static async run(params: AgentRunParams): Promise<AgentRunResult> {
    const { systemPrompt, messages, callbacks, temperature = 0.5, maxTokens = 600 } = params;

    // Enhance system prompt with agent harness instructions
    const augmentedSystemPrompt = `${systemPrompt}\n${buildAgentToolPrompt()}`;
    const conversationHistory = [...messages];
    const steps: AgentExecutionStep[] = [];
    let totalTokens = 0;
    let finalTokensPerSecond = 0;
    let toolCallsCount = 0;

    while (toolCallsCount < MAX_TOOL_CALLS) {
      let iterationStreamedText = '';

      const completionResult: CompletionResult = await llmService.streamCompletion(
        {
          systemPrompt: augmentedSystemPrompt,
          messages: conversationHistory,
          temperature,
          maxTokens,
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

      // Append assistant tool call and tool result to conversation context for next iteration
      conversationHistory.push({
        role: 'assistant',
        content: `<tool_call>\n${JSON.stringify({
          name: detectedCall.name,
          arguments: detectedCall.arguments,
        })}\n</tool_call>`,
      });

      conversationHistory.push({
        role: 'user',
        content: `<tool_result>\n${JSON.stringify(
          toolResult.success ? toolResult.data : { error: toolResult.error }
        )}\n</tool_result>\nTool execution completed. Now synthesize and write your complete coaching response for the athlete.`,
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
        systemPrompt: augmentedSystemPrompt,
        messages: conversationHistory,
        temperature,
        maxTokens: Math.max(maxTokens, 800),
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
    };
  }
}

