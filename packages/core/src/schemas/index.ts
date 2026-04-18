import { z } from 'zod';

export const AgentRoleSchema = z.enum([
  'orchestrator',
  'planner',
  'developer',
  'tester',
  'reviewer',
  'debugger',
]);

export const WorkflowPhaseSchema = z.enum([
  'analyze',
  'plan',
  'implement',
  'test',
  'review',
]);

export const TaskInputSchema = z.object({
  prompt: z.string().min(1),
  prdPath: z.string().optional(),
  context: z.string().optional(),
});

export const FileArtifactSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  diff: z.string().optional(),
});

export const CodebaseContextSchema = z.object({
  stack: z.array(z.string()),
  rootDir: z.string(),
  folderStructure: z.string(),
  patterns: z.record(z.string(), z.string()),
  claudeMd: z.string().optional(),
});

export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  role: AgentRoleSchema,
  input: TaskInputSchema,
  context: CodebaseContextSchema,
  tokenBudget: z.number().int().positive(),
  phase: WorkflowPhaseSchema,
});

export const AgentOutputSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['success', 'failed', 'needs_review']),
  artifacts: z.array(FileArtifactSchema),
  tokensUsed: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  handoffTo: AgentRoleSchema.optional(),
  handoffPayload: TaskInputSchema.optional(),
});

export const TaskNodeSchema = z.object({
  id: z.string().uuid(),
  role: AgentRoleSchema,
  phase: WorkflowPhaseSchema,
  input: TaskInputSchema,
  dependencies: z.array(z.string().uuid()),
});

export const PhaseCheckpointSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  phase: WorkflowPhaseSchema,
  stateJson: z.string(),
  createdAt: z.date(),
});

export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  thinkingTokens: z.number().int().nonnegative(),
});

export const TraceRecordSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  role: AgentRoleSchema,
  model: z.string(),
  phase: WorkflowPhaseSchema,
  tokenUsage: TokenUsageSchema,
  cost: z.number().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  createdAt: z.date(),
});
