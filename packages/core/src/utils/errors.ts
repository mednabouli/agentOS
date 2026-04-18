import type { AgentRole, WorkflowPhase } from '../types/index.js';

export class AgentOSError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AgentOSError';
  }
}

export class PhaseError extends AgentOSError {
  constructor(
    message: string,
    public readonly phase: WorkflowPhase,
    public readonly taskId: string,
  ) {
    super(message, 'PHASE_ERROR');
    this.name = 'PhaseError';
  }
}

export class SpawnError extends AgentOSError {
  constructor(
    message: string,
    public readonly role: AgentRole,
    public readonly taskId: string,
    public override readonly cause?: unknown,
  ) {
    super(message, 'SPAWN_ERROR');
    this.name = 'SpawnError';
  }
}

export class StateError extends AgentOSError {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message, 'STATE_ERROR');
    this.name = 'StateError';
  }
}

export class ApprovalRejectedError extends AgentOSError {
  constructor(
    public readonly taskId: string,
    public readonly phase: WorkflowPhase,
    public readonly reason?: string,
  ) {
    super(`Task ${taskId} rejected at phase ${phase}${reason ? `: ${reason}` : ''}`, 'APPROVAL_REJECTED');
    this.name = 'ApprovalRejectedError';
  }
}

export class BudgetExceededError extends AgentOSError {
  constructor(
    public readonly taskId: string,
    public readonly cost: number,
    public readonly limit: number,
  ) {
    super(`Task ${taskId} exceeded budget: $${cost.toFixed(4)} > $${limit.toFixed(4)}`, 'BUDGET_EXCEEDED');
    this.name = 'BudgetExceededError';
  }
}
