import Anthropic from '@anthropic-ai/sdk';
import type { AgentRole, AgentTask, AgentOutput, FileArtifact, TokenUsage } from '../types/index.js';
import { getModelConfig, calculateCost } from '../config/model-registry.js';
import { generateId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { SpawnError } from '../utils/errors.js';

export interface SpawnOptions {
  apiKey?: string | undefined;
  systemPrompt?: string | undefined;
}

export class AgentSpawner {
  private readonly client: Anthropic;

  constructor(options: SpawnOptions = {}) {
    this.client = new Anthropic({
      apiKey: options.apiKey ?? process.env['ANTHROPIC_API_KEY'],
    });
  }

  async spawn(task: AgentTask, options: SpawnOptions = {}): Promise<AgentOutput> {
    const config = getModelConfig(task.role);
    const agentId = generateId();

    logger.info('Spawning agent', {
      agentId,
      role: task.role,
      model: config.model,
      phase: task.phase,
      taskId: task.id,
    });

    const systemPrompt = options.systemPrompt ?? buildSystemPrompt(task);
    const userMessage = buildUserMessage(task);

    try {
      const startMs = Date.now();

      const params = buildRequestParams(config, systemPrompt, userMessage);
      const response = await this.client.messages.create(params);

      const latencyMs = Date.now() - startMs;
      const usage = extractUsage(response.usage);
      const cost = calculateCost(task.role, usage.inputTokens, usage.outputTokens);

      logger.info('Agent completed', {
        agentId,
        role: task.role,
        latencyMs,
        cost: cost.toFixed(6),
        tokensUsed: usage.inputTokens + usage.outputTokens,
      });

      const text = extractText(response.content);
      const artifacts = parseArtifacts(text);
      const { handoffTo, handoffPayload } = parseHandoff(text);

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

function buildRequestParams(
  config: ReturnType<typeof getModelConfig>,
  systemPrompt: string,
  userMessage: string,
): Anthropic.Messages.MessageCreateParamsNonStreaming {
  const base: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: config.model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };

  if (config.thinkingBudget > 0) {
    return {
      ...base,
      thinking: { type: 'enabled', budget_tokens: config.thinkingBudget },
    } as Anthropic.Messages.MessageCreateParamsNonStreaming;
  }

  return base;
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

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

function extractUsage(usage: Anthropic.Messages.Usage): TokenUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    thinkingTokens: 0,
  };
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
