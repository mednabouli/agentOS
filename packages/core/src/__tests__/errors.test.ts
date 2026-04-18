import { describe, it, expect } from 'vitest';
import {
  AgentOSError,
  PhaseError,
  SpawnError,
  StateError,
  ApprovalRejectedError,
  BudgetExceededError,
} from '../utils/errors.js';

describe('AgentOSError', () => {
  it('is an instance of Error', () => {
    const err = new AgentOSError('test', 'TEST_CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('TEST_CODE');
    expect(err.name).toBe('AgentOSError');
  });
});

describe('PhaseError', () => {
  it('carries phase and taskId', () => {
    const err = new PhaseError('failed', 'plan', 'task-1');
    expect(err.phase).toBe('plan');
    expect(err.taskId).toBe('task-1');
    expect(err).toBeInstanceOf(AgentOSError);
  });
});

describe('SpawnError', () => {
  it('carries role and taskId', () => {
    const cause = new Error('network');
    const err = new SpawnError('spawn failed', 'developer', 'task-2', cause);
    expect(err.role).toBe('developer');
    expect(err.taskId).toBe('task-2');
    expect(err.cause).toBe(cause);
  });
});

describe('ApprovalRejectedError', () => {
  it('includes task and phase in message', () => {
    const err = new ApprovalRejectedError('task-3', 'plan', 'bad plan');
    expect(err.message).toContain('task-3');
    expect(err.message).toContain('plan');
    expect(err.reason).toBe('bad plan');
  });
});

describe('BudgetExceededError', () => {
  it('includes cost and limit in message', () => {
    const err = new BudgetExceededError('task-4', 2.5, 1.0);
    expect(err.message).toContain('2.5');
    expect(err.cost).toBe(2.5);
    expect(err.limit).toBe(1.0);
  });
});

describe('StateError', () => {
  it('is an AgentOSError', () => {
    expect(new StateError('db down')).toBeInstanceOf(AgentOSError);
  });
});
