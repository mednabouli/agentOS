import type { AgentRole, AgentTask, AgentOutput, FileArtifact, TokenUsage } from '../types/index.js';
import { getModelConfig, calculateCost } from '../config/model-registry.js';
import { loadRoutingConfig, resolveRoute, type RoutingConfig } from '../config/routing.js';
import { createProvider } from '../providers/factory.js';
import type { ProviderCredentials } from '../providers/types.js';
import { generateId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { SpawnError } from '../utils/errors.js';

export interface SpawnOptions {
  apiKey?: string | undefined;
  systemPrompt?: string | undefined;
  routing?: RoutingConfig | undefined;
}

export class AgentSpawner {
  private readonly apiKey: string | undefined;
  private readonly routing: RoutingConfig;

  constructor(options: SpawnOptions = {}) {
    this.apiKey = options.apiKey ?? process.env['ANTHROPIC_API_KEY'];
    this.routing =
      options.routing ??
      loadRoutingConfig(
        process.env['AGENTOS_STATE_DIR'] !== undefined
          ? process.env['AGENTOS_STATE_DIR'] + '/..'
          : undefined,
      );
  }

  async spawn(task: AgentTask, options: SpawnOptions = {}): Promise<AgentOutput> {
    const modelConfig = getModelConfig(task.role);
    const routing = options.routing ?? this.routing;
    const { provider: providerType, model, credentials } = resolveRoute(task.role, routing);
    const resolvedModel = model ?? modelConfig.model;
    const agentId = generateId();

    logger.info('Spawning agent', {
      agentId,
      role: task.role,
      provider: providerType,
      model: resolvedModel,
      phase: task.phase,
      taskId: task.id,
    });

    const creds: ProviderCredentials = {
      ...credentials,
      apiKey: credentials.apiKey ?? this.apiKey,
    };

    const provider = createProvider(providerType, creds);
    const systemPrompt = options.systemPrompt ?? buildSystemPrompt(task);
    const userMessage = buildUserMessage(task);

    try {
      const startMs = Date.now();

      const response = await provider.complete({
        model: resolvedModel,
        systemPrompt,
        userMessage,
        thinkingBudget: modelConfig.thinkingBudget,
        maxTokens: 8192,
      });

      const latencyMs = Date.now() - startMs;
      const usage: TokenUsage = {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        cacheReadTokens: response.cacheReadTokens,
        cacheWriteTokens: response.cacheWriteTokens,
        thinkingTokens: response.thinkingTokens,
      };
      const cost = calculateCost(task.role, usage.inputTokens, usage.outputTokens);

      logger.info('Agent completed', {
        agentId,
        role: task.role,
        provider: providerType,
        latencyMs,
        cost: cost.toFixed(6),
        tokensUsed: usage.inputTokens + usage.outputTokens,
      });

      const artifacts = parseArtifacts(response.text);
      const { handoffTo, handoffPayload } = parseHandoff(response.text);

      return {
        taskId: task.id,
        status: 'success',
        artifacts,
        tokensUsed: usage.inputTokens + usage.outputTokens,
        cost,
        handoffTo,
        handoffPayload,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Agent spawn failed', { agentId, role: task.role, error: message });
      throw new SpawnError(`Agent ${task.role} failed: ${message}`, task.role, task.id, err);
    }
  }
}

function buildSystemPrompt(task: AgentTask): string {
  return [
    `You are the ${task.role} agent in an AgentOS multi-agent swarm.`,
    `Current phase: ${task.phase}`,
    `Task ID: ${task.id}`,
    '',
    '## Codebase Context',
    task.context.claudeMd ?? `Stack: ${task.context.stack.join(', ')}`,
    '',
    '## Instructions',
    'Respond with your analysis and any file artifacts using ```file:path/to/file fences.',
    'For handoffs, end your response with:',
    'HANDOFF_TO: <role>',
    'HANDOFF_PAYLOAD: {"prompt": "..."}',
  ].join('\n');
}

function buildUserMessage(task: AgentTask): string {
  const parts: string[] = [`## Task\n${task.input.prompt}`];
  if (task.input.context !== undefined) {
    parts.push(`## Additional Context\n${task.input.context}`);
  }
  return parts.join('\n\n');
}

const FILE_FENCE_RE = /```file:([^\n]+)\n([\s\S]*?)```/g;

function parseArtifacts(text: string): FileArtifact[] {
  const artifacts: FileArtifact[] = [];
  let match: RegExpExecArray | null;
  while ((match = FILE_FENCE_RE.exec(text)) !== null) {
    const path = match[1]?.trim();
    const content = match[2] ?? '';
    if (path !== undefined && path.length > 0) {
      artifacts.push({ path, content });
    }
  }
  return artifacts;
}

function parseHandoff(text: string): {
  handoffTo: AgentRole | undefined;
  handoffPayload: { prompt: string } | undefined;
} {
  const roleMatch = /HANDOFF_TO:\s*(\w+)/.exec(text);
  const payloadMatch = /HANDOFF_PAYLOAD:\s*(\{[\s\S]*?\})\s*$/.exec(text);

  if (roleMatch === null) {
    return { handoffTo: undefined, handoffPayload: undefined };
  }

  const role = roleMatch[1] as AgentRole | undefined;
  let handoffPayload: { prompt: string } | undefined;

  if (payloadMatch !== null) {
    try {
      handoffPayload = JSON.parse(payloadMatch[1] ?? '{}') as { prompt: string };
    } catch {
      handoffPayload = undefined;
    }
  }

  return { handoffTo: role, handoffPayload };
}
