import { AGENT_TOOLS } from './tools';
import { executeTool } from './dispatcher';
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
   - Do NOT call get_fitness_telemetry or get_workout_plan if the data is already present in the ATHLETE CONTEXT. Answer the athlete directly!
2. ONLY call tools when:
   - The athlete requests an ACTION (e.g. "log my food", "save/change this workout plan", "update my goal", "swap an exercise").
   - Detailed external database search is needed (search_food_database, search_exercise_database) or reading past days history.
3. PROTOCOL:
   - When calling a tool, emit EXACTLY one tool call tag:
<tool_call>
{"name": "tool_name", "arguments": { ... }}
</tool_call>
   - When tool results are provided, synthesize your full coaching answer directly.
   - If no action or tool call is needed, respond normally to the athlete without any <tool_call> tags.
`;
}

/**
 * Extracts a tool call from LLM output text
 */
export function parseToolCallFromText(text: string): ToolCall | null {
  const match = text.match(/<tool_call>([\s\S]*?)<\/tool_call>/i);
  if (!match) return null;

  try {
    const jsonStr = match[1].trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.name === 'string') {
      return {
        id: `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: parsed.name,
        arguments: parsed.arguments || {},
      };
    }
  } catch (err) {
    console.warn('[AgentHarness] Failed to parse tool call JSON:', err);
  }
  return null;
}

/**
 * Finds domain and access type for a tool
 */
function getToolMeta(toolName: string): { domain: DomainName; access: ToolAccessType } {
  const def = AGENT_TOOLS.find((t) => t.name === toolName);
  return {
    domain: def?.domain || 'settings',
    access: def?.access || 'read',
  };
}

export interface AgentRunParams {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  callbacks?: AgentExecutionCallbacks;
  temperature?: number;
  maxTokens?: number;
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
        },
        (token: string) => {
          iterationStreamedText += token;
          // Only stream tokens directly to user if not in middle of a tool call
          if (!iterationStreamedText.includes('<tool_call>')) {
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
        // Strip any residual partial tags just in case
        const cleanFinalText = outputText
          .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
          .replace(/<\/?tool_call>/gi, '')
          .trim();

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

    const cleanFinalText = synthesisResult.fullText
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<\/?tool_call>/gi, '')
      .trim();

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

