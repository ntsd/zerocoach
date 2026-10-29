export type DomainName =
  | 'telemetry'
  | 'food_history'
  | 'food_database'
  | 'workout_history'
  | 'workout_plan'
  | 'workout_database'
  | 'settings';

export type ToolAccessType = 'read' | 'write';

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: {
    type: string;
    properties?: Record<string, any>;
  };
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  domain: DomainName;
  access: ToolAccessType;
  parameters: ToolParameters;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}

export type StepStatus = 'running' | 'completed' | 'failed';

export interface AgentExecutionStep {
  id: string;
  toolName: string;
  domain: DomainName;
  access: ToolAccessType;
  status: StepStatus;
  summary: string;
  timestamp: number;
}

export interface AgentExecutionCallbacks {
  onStepUpdate?: (step: AgentExecutionStep) => void;
  onToken?: (token: string) => void;
}

