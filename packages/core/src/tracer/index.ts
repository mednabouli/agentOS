import type { AgentRole, WorkflowPhase, TokenUsage, TraceRecord } from '../types/index.js';
import { generateId } from '../utils/id.js';
import { calculateCost } from '../config/model-registry.js';
import { getModelConfig } from '../config/model-registry.js';
import { logger } from '../utils/logger.js';

export class Tracer {
  private records: TraceRecord[] = [];

  record(
    taskId: string,
    role: AgentRole,
    phase: WorkflowPhase,
    tokenUsage: TokenUsage,
    latencyMs: number,
  ): TraceRecord {
    const config = getModelConfig(role);
    const cost = calculateCost(role, tokenUsage.inputTokens, tokenUsage.outputTokens);

    const record: TraceRecord = {
      id: generateId(),
      taskId,
      role,
      model: config.model,
      phase,
      tokenUsage,
      cost,
      latencyMs,
      createdAt: new Date(),
    };

    this.records.push(record);

    logger.debug('Trace recorded', {
      role,
      phase,
      cost: cost.toFixed(6),
      latencyMs,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
    });

    return record;
  }

  getRecordsForTask(taskId: string): TraceRecord[] {
    return this.records.filter((r) => r.taskId === taskId);
  }

  getTotalCost(taskId: string): number {
    return this.getRecordsForTask(taskId).reduce((sum, r) => sum + r.cost, 0);
  }

  getTotalTokens(taskId: string): number {
    return this.getRecordsForTask(taskId).reduce(
      (sum, r) => sum + r.tokenUsage.inputTokens + r.tokenUsage.outputTokens,
      0,
    );
  }

  getCostByRole(taskId: string): Partial<Record<AgentRole, number>> {
    const result: Partial<Record<AgentRole, number>> = {};
    for (const record of this.getRecordsForTask(taskId)) {
      const existing = result[record.role] ?? 0;
      result[record.role] = existing + record.cost;
    }
    return result;
  }

  getSummary(taskId: string): {
    totalCost: number;
    totalTokens: number;
    byRole: Partial<Record<AgentRole, number>>;
    records: TraceRecord[];
  } {
    return {
      totalCost: this.getTotalCost(taskId),
      totalTokens: this.getTotalTokens(taskId),
      byRole: this.getCostByRole(taskId),
      records: this.getRecordsForTask(taskId),
    };
  }

  clear(taskId?: string): void {
    if (taskId !== undefined) {
      this.records = this.records.filter((r) => r.taskId !== taskId);
    } else {
      this.records = [];
    }
  }
}
