export type AgentRole =
  | 'orchestrator'
  | 'planner'
  | 'developer'
  | 'tester'
  | 'reviewer'
  | 'debugger';

export type WorkflowPhase = 'analyze' | 'plan' | 'implement' | 'test' | 'review';

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'paused';

export type AgentOutputStatus = 'success' | 'failed' | 'needs_review';

export interface TaskInput {
  prompt: string;
  prdPath?: string | undefined;
  context?: string | undefined;
}

export interface FileArtifact {
  path: string;
  content: string;
  diff?: string | undefined;
}

export interface CodebaseContext {
  stack: string[];
  rootDir: string;
  folderStructure: string;
  patterns: Record<string, string>;
  claudeMd?: string | undefined;
}

export interface AgentTask {
  id: string;
  role: AgentRole;
  input: TaskInput;
  context: CodebaseContext;
  tokenBudget: number;
  phase: WorkflowPhase;
}

export interface AgentOutput {
  taskId: string;
  status: AgentOutputStatus;
  artifacts: FileArtifact[];
  tokensUsed: number;
  cost: number;
  handoffTo?: AgentRole | undefined;
  handoffPayload?: TaskInput | undefined;
}

export interface TaskNode {
  id: string;
  role: AgentRole;
  phase: WorkflowPhase;
  input: TaskInput;
  dependencies: string[];
}

export interface PhaseCheckpoint {
  id: string;
  taskId: string;
  phase: WorkflowPhase;
  stateJson: string;
  createdAt: Date;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  thinkingTokens: number;
}

export interface TraceRecord {
  id: string;
  taskId: string;
  role: AgentRole;
  model: string;
  phase: WorkflowPhase;
  tokenUsage: TokenUsage;
  cost: number;
  latencyMs: number;
  createdAt: Date;
}

// WorkflowEngine event union
export type WorkflowEvent =
  | { type: 'phase_started'; taskId: string; phase: WorkflowPhase }
  | { type: 'phase_completed'; taskId: string; phase: WorkflowPhase; output: AgentOutput }
  | { type: 'phase_failed'; taskId: string; phase: WorkflowPhase; error: string }
  | { type: 'human_approval_required'; taskId: string; phase: WorkflowPhase; summary: string }
  | { type: 'human_approved'; taskId: string; phase: WorkflowPhase }
  | { type: 'human_rejected'; taskId: string; phase: WorkflowPhase; reason?: string }
  | { type: 'task_completed'; taskId: string; totalCost: number }
  | { type: 'task_failed'; taskId: string; error: string }
  | { type: 'agent_spawned'; taskId: string; role: AgentRole; agentId: string }
  | { type: 'token_usage'; taskId: string; role: AgentRole; usage: TokenUsage; cost: number };
