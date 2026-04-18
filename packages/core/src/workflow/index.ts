import { EventEmitter } from 'node:events';
import type {
  TaskNode,
  WorkflowPhase,
  WorkflowEvent,
  CodebaseContext,
  AgentOutput,
} from '../types/index.js';
import { Orchestrator } from '../orchestrator/index.js';
import { StateManager } from '../state/index.js';
import { Tracer } from '../tracer/index.js';
import { PHASES, requiresApproval, nextPhase } from '../config/phases.js';
import { generateId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import {
  PhaseError,
  ApprovalRejectedError,
} from '../utils/errors.js';

export interface WorkflowOptions {
  apiKey?: string | undefined;
  context: CodebaseContext;
}

export interface WorkflowRunOptions {
  resumeFrom?: WorkflowPhase | undefined;
}

type ApprovalResolver = (approved: boolean, reason?: string) => void;

export class WorkflowEngine {
  private readonly emitter = new EventEmitter();
  private readonly orchestrator: Orchestrator;
  private readonly stateManager: StateManager;
  private readonly tracer: Tracer;

  private pendingApprovals = new Map<string, ApprovalResolver>();

  constructor(options: WorkflowOptions) {
    this.tracer = new Tracer();
    this.stateManager = new StateManager();
    this.orchestrator = new Orchestrator({
      apiKey: options.apiKey,
      context: options.context,
      tracer: this.tracer,
    });
  }

  on(event: 'event', listener: (e: WorkflowEvent) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  off(event: 'event', listener: (e: WorkflowEvent) => void): this {
    this.emitter.off(event, listener);
    return this;
  }

  async run(nodes: TaskNode[], opts: WorkflowRunOptions = {}): Promise<string> {
    const taskId = generateId();
    const startPhase = opts.resumeFrom ?? PHASES[0];

    if (startPhase === undefined) {
      throw new Error('PHASES array is empty — misconfiguration');
    }

    logger.info('WorkflowEngine: starting run', { taskId, startPhase });

    this.fire({ type: 'phase_started', taskId, phase: startPhase });

    try {
      await this.runFromPhase(taskId, nodes, startPhase);

      const totalCost = this.tracer.getTotalCost(taskId);
      this.fire({ type: 'task_completed', taskId, totalCost });

      logger.info('WorkflowEngine: task completed', { taskId, totalCost: totalCost.toFixed(6) });
      return taskId;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.fire({ type: 'task_failed', taskId, error: message });
      logger.error('WorkflowEngine: task failed', { taskId, error: message });
      throw err;
    }
  }

  approve(taskId: string): void {
    const resolver = this.pendingApprovals.get(taskId);
    if (resolver === undefined) {
      logger.warn('WorkflowEngine: no pending approval found', { taskId });
      return;
    }
    this.pendingApprovals.delete(taskId);
    resolver(true);
  }

  reject(taskId: string, reason?: string): void {
    const resolver = this.pendingApprovals.get(taskId);
    if (resolver === undefined) {
      logger.warn('WorkflowEngine: no pending approval found', { taskId });
      return;
    }
    this.pendingApprovals.delete(taskId);
    resolver(false, reason);
  }

  getTracer(): Tracer {
    return this.tracer;
  }

  private fire(event: WorkflowEvent): void {
    this.emitter.emit('event', event);
  }

  private async runFromPhase(
    taskId: string,
    nodes: TaskNode[],
    fromPhase: WorkflowPhase,
  ): Promise<void> {
    const startIdx = PHASES.indexOf(fromPhase);
    if (startIdx === -1) throw new PhaseError(`Unknown phase: ${fromPhase}`, fromPhase, taskId);

    for (let i = startIdx; i < PHASES.length; i++) {
      const phase = PHASES[i];
      if (phase === undefined) break;

      this.fire({ type: 'phase_started', taskId, phase });

      if (requiresApproval(phase)) {
        await this.waitForApproval(taskId, phase, nodes);
      }

      let results: Awaited<ReturnType<Orchestrator['executeDag']>>;
      try {
        results = await this.orchestrator.executeDag(nodes, taskId, phase);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.fire({ type: 'phase_failed', taskId, phase, error: message });
        throw new PhaseError(`Phase ${phase} failed: ${message}`, phase, taskId);
      }

      const lastOutput: AgentOutput | undefined = results[results.length - 1]?.output;

      if (lastOutput !== undefined) {
        this.fire({ type: 'phase_completed', taskId, phase, output: lastOutput });

        await this.stateManager.saveCheckpoint(taskId, phase, {
          phase,
          outputStatus: lastOutput.status,
          artifactCount: lastOutput.artifacts.length,
          cost: this.tracer.getTotalCost(taskId),
        });
      }

      const next = nextPhase(phase);
      if (next !== null) {
        this.fire({ type: 'phase_started', taskId, phase: next });
      }
    }
  }

  private waitForApproval(
    taskId: string,
    phase: WorkflowPhase,
    nodes: TaskNode[],
  ): Promise<void> {
    const phaseNodes = nodes.filter((n) => n.phase === phase);
    const summary = phaseNodes
      .map((n) => `- [${n.role}] ${n.input.prompt.slice(0, 80)}`)
      .join('\n');

    this.fire({ type: 'human_approval_required', taskId, phase, summary });

    return new Promise<void>((resolve, reject) => {
      const resolver: ApprovalResolver = (approved, reason) => {
        if (approved) {
          this.fire({ type: 'human_approved', taskId, phase });
          resolve();
        } else {
          this.fire({
            type: 'human_rejected',
            taskId,
            phase,
            ...(reason !== undefined ? { reason } : {}),
          });
          reject(new ApprovalRejectedError(taskId, phase, reason));
        }
      };

      this.pendingApprovals.set(taskId, resolver);
    });
  }
}
