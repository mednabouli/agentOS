import type { TaskNode, AgentTask, AgentOutput, CodebaseContext, WorkflowPhase } from '../types/index.js';
import { AgentSpawner } from '../spawner/index.js';
import { Tracer } from '../tracer/index.js';
import { generateId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { getModelConfig } from '../config/model-registry.js';

export interface OrchestratorOptions {
  apiKey?: string | undefined;
  context: CodebaseContext;
  tracer?: Tracer | undefined;
}

export interface ExecutionResult {
  taskId: string;
  nodeId: string;
  output: AgentOutput;
}

export class Orchestrator {
  private readonly spawner: AgentSpawner;
  private readonly tracer: Tracer;
  private readonly context: CodebaseContext;

  constructor(options: OrchestratorOptions) {
    this.spawner = new AgentSpawner({ apiKey: options.apiKey });
    this.tracer = options.tracer ?? new Tracer();
    this.context = options.context;
  }

  async executeNode(
    node: TaskNode,
    parentTaskId: string,
  ): Promise<ExecutionResult> {
    const config = getModelConfig(node.role);

    const agentTask: AgentTask = {
      id: generateId(),
      role: node.role,
      input: node.input,
      context: this.context,
      tokenBudget: config.thinkingBudget,
      phase: node.phase,
    };

    logger.info('Orchestrator: executing node', {
      nodeId: node.id,
      role: node.role,
      phase: node.phase,
      parentTaskId,
    });

    const startMs = Date.now();
    const output = await this.spawner.spawn(agentTask);
    const latencyMs = Date.now() - startMs;

    this.tracer.record(
      parentTaskId,
      node.role,
      node.phase,
      {
        inputTokens: Math.floor(output.tokensUsed * 0.6),
        outputTokens: Math.floor(output.tokensUsed * 0.4),
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        thinkingTokens: 0,
      },
      latencyMs,
    );

    return { taskId: agentTask.id, nodeId: node.id, output };
  }

  /**
   * Execute a DAG of task nodes respecting dependencies.
   * Nodes with no pending dependencies are executed in parallel.
   */
  async executeDag(
    nodes: TaskNode[],
    parentTaskId: string,
    phaseFilter?: WorkflowPhase,
  ): Promise<ExecutionResult[]> {
    const filtered = phaseFilter !== undefined
      ? nodes.filter((n) => n.phase === phaseFilter)
      : nodes;

    const completed = new Set<string>();
    const results: ExecutionResult[] = [];

    while (results.length < filtered.length) {
      const ready = filtered.filter(
        (n) =>
          !completed.has(n.id) &&
          n.dependencies.every((dep) => completed.has(dep)),
      );

      if (ready.length === 0 && results.length < filtered.length) {
        throw new Error('Circular dependency detected in task DAG');
      }

      const batch = await Promise.all(
        ready.map((node) => this.executeNode(node, parentTaskId)),
      );

      for (const result of batch) {
        results.push(result);
        completed.add(result.nodeId);
      }
    }

    return results;
  }

  getTracer(): Tracer {
    return this.tracer;
  }
}
