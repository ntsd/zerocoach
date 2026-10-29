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

const MAX_AGENT_ITERATIONS = 3;

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

TOOL CALLING PROTOCOL:
When you need to read data or perform an action requested by the athlete (e.g. log food, swap an exercise, check telemetry, search database, or update goals), emit EXACTLY one tool call tag:
<tool_call>
{"name": "tool_name", "arguments": { ... }}
</tool_call>

RULES:
1. When calling a tool, output ONLY the <tool_call> tag and nothing else in that turn.
2. After the tool result is provided, provide a direct, concise, and helpful response to the athlete.
3. If no action or tool call is needed, respond normally to the athlete without any <tool_call> tags.
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
    let iteration = 0;

    while (iteration < MAX_AGENT_ITERATIONS) {
      iteration++;

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
      const meta = getToolMeta(detectedCall.name);
      const stepId = `step-${Date.now()}-${iteration}`;
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
        )}\n</tool_result>\nPlease provide the final response to the user based on this result.`,
      });
    }

    // Fallback if max iterations exceeded
    return {
      fullText: 'Action completed. Please check your updated dashboard.',
      steps,
      tokensGenerated: totalTokens,
      tokensPerSecond: finalTokensPerSecond,
    };
  }
}

