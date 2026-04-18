import { describe, it, expect } from 'vitest';
import { initialState, tuiReducer } from '../state.js';
import type { WorkflowEvent } from '@agentos/core';

function event(e: WorkflowEvent) {
  return { type: 'workflow_event' as const, event: e };
}

describe('tuiReducer', () => {
  it('phase_started sets currentPhase and taskId', () => {
    const s = tuiReducer(
      initialState(),
      event({ type: 'phase_started', taskId: 'task-1', phase: 'analyze' }),
    );
    expect(s.currentPhase).toBe('analyze');
    expect(s.taskId).toBe('task-1');
    expect(s.phaseStatus.analyze).toBe('running');
    expect(s.logs).toHaveLength(1);
  });

  it('phase_completed marks phase done', () => {
    const mockOutput = {
      taskId: 't',
      status: 'success' as const,
      artifacts: [],
      tokensUsed: 100,
      cost: 0.001,
    };
    let s = tuiReducer(
      initialState(),
      event({ type: 'phase_started', taskId: 't', phase: 'analyze' }),
    );
    s = tuiReducer(
      s,
      event({ type: 'phase_completed', taskId: 't', phase: 'analyze', output: mockOutput }),
    );
    expect(s.phaseStatus.analyze).toBe('completed');
  });

  it('phase_failed marks phase failed', () => {
    const s = tuiReducer(
      initialState(),
      event({ type: 'phase_failed', taskId: 't', phase: 'implement', error: 'boom' }),
    );
    expect(s.phaseStatus.implement).toBe('failed');
  });

  it('human_approval_required sets pendingApproval', () => {
    const s = tuiReducer(
      initialState(),
      event({
        type: 'human_approval_required',
        taskId: 't',
        phase: 'plan',
        summary: 'Create auth.ts',
      }),
    );
    expect(s.pendingApproval).not.toBeNull();
    expect(s.pendingApproval?.taskId).toBe('t');
    expect(s.pendingApproval?.phase).toBe('plan');
    expect(s.pendingApproval?.summary).toBe('Create auth.ts');
  });

  it('human_approved clears pendingApproval', () => {
    let s = tuiReducer(
      initialState(),
      event({ type: 'human_approval_required', taskId: 't', phase: 'plan', summary: 'plan' }),
    );
    s = tuiReducer(s, event({ type: 'human_approved', taskId: 't', phase: 'plan' }));
    expect(s.pendingApproval).toBeNull();
  });

  it('human_rejected clears pendingApproval', () => {
    let s = tuiReducer(
      initialState(),
      event({ type: 'human_approval_required', taskId: 't', phase: 'plan', summary: 'plan' }),
    );
    s = tuiReducer(s, event({ type: 'human_rejected', taskId: 't', phase: 'plan', reason: 'bad' }));
    expect(s.pendingApproval).toBeNull();
    expect(s.logs.at(-1)).toContain('bad');
  });

  it('task_completed sets completed and totalCost', () => {
    const s = tuiReducer(
      initialState(),
      event({ type: 'task_completed', taskId: 't', totalCost: 0.0512 }),
    );
    expect(s.completed).toBe(true);
    expect(s.totalCost).toBe(0.0512);
  });

  it('task_failed sets failedReason', () => {
    const s = tuiReducer(
      initialState(),
      event({ type: 'task_failed', taskId: 't', error: 'network error' }),
    );
    expect(s.failedReason).toBe('network error');
  });

  it('agent_spawned appends to agents list', () => {
    let s = tuiReducer(
      initialState(),
      event({ type: 'phase_started', taskId: 't', phase: 'implement' }),
    );
    s = tuiReducer(
      s,
      event({ type: 'agent_spawned', taskId: 't', role: 'developer', agentId: 'agent-1' }),
    );
    expect(s.agents).toHaveLength(1);
    expect(s.agents[0]?.role).toBe('developer');
    expect(s.agents[0]?.phase).toBe('implement');
  });

  it('token_usage accumulates per role and adds to totalCost', () => {
    const usage = {
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      thinkingTokens: 200,
    };
    let s = tuiReducer(
      initialState(),
      event({ type: 'token_usage', taskId: 't', role: 'developer', usage, cost: 0.01 }),
    );
    s = tuiReducer(
      s,
      event({
        type: 'token_usage',
        taskId: 't',
        role: 'developer',
        usage: { ...usage, thinkingTokens: 100 },
        cost: 0.005,
      }),
    );
    expect(s.tokenUsage.developer?.thinkingTokens).toBe(300);
    expect(s.totalCost).toBeCloseTo(0.015);
  });

  it('toggle_logs flips showLogs', () => {
    const s1 = tuiReducer(initialState(), { type: 'toggle_logs' });
    expect(s1.showLogs).toBe(false);
    const s2 = tuiReducer(s1, { type: 'toggle_logs' });
    expect(s2.showLogs).toBe(true);
  });

  it('logs are capped at 100 entries', () => {
    let s = initialState();
    for (let i = 0; i < 110; i++) {
      s = tuiReducer(
        s,
        event({ type: 'phase_started', taskId: 't', phase: 'analyze' }),
      );
    }
    expect(s.logs.length).toBeLessThanOrEqual(100);
  });
});
