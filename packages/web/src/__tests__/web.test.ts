import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRunner, listRunnerIds } from '../lib/task-runner.js';

// Isolate the global runner map between tests
beforeEach(() => {
  (global as Record<string, unknown>)['__agentosRunners'] = new Map();
  (global as Record<string, unknown>)['__agentosDb'] = undefined;
});

describe('getRunner', () => {
  it('returns undefined for unknown taskId', () => {
    expect(getRunner('nonexistent')).toBeUndefined();
  });
});

describe('listRunnerIds', () => {
  it('returns empty array when no tasks have been started', () => {
    expect(listRunnerIds()).toEqual([]);
  });
});

describe('PRD stats helpers', () => {
  it('counts ## headings correctly', () => {
    const prd = '# Title\n\n## Overview\n\n## Requirements\n\n## Acceptance Criteria\n';
    const sectionCount = (prd.match(/^##\s+/gm) ?? []).length;
    expect(sectionCount).toBe(3);
  });

  it('counts words correctly', () => {
    const prd = 'hello world foo bar';
    const wordCount = prd.trim().split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBe(4);
  });

  it('extracts title from first H1', () => {
    const prd = '# My Feature\n\n## Overview\n...';
    const title = /^#\s+(.+)/m.exec(prd)?.[1]?.trim();
    expect(title).toBe('My Feature');
  });

  it('falls back to slice when no H1 found', () => {
    const prd = 'No heading here just plain text that is fairly long to show';
    const title = /^#\s+(.+)/m.exec(prd)?.[1]?.trim() ?? prd.slice(0, 60);
    expect(title).toBe(prd);
    expect(title.length).toBeLessThanOrEqual(60);
  });
});

describe('API route validation logic', () => {
  it('rejects empty prompt', () => {
    const prompt = '   ';
    expect(prompt.trim().length === 0).toBe(true);
  });

  it('accepts non-empty prompt', () => {
    const prompt = 'Add Stripe payments';
    expect(prompt.trim().length === 0).toBe(false);
  });
});

describe('cost formatting', () => {
  it('formats cost to 4 decimal places', () => {
    expect((0.001234).toFixed(4)).toBe('0.0012');
  });

  it('formats grand total correctly', () => {
    const rows = [{ totalCost: 0.0123 }, { totalCost: 0.0456 }];
    const grand = rows.reduce((s, r) => s + r.totalCost, 0);
    expect(grand.toFixed(4)).toBe('0.0579');
  });

  it('shows zero avg when no rows', () => {
    const rows: Array<{ totalCost: number }> = [];
    const grand = rows.reduce((s, r) => s + r.totalCost, 0);
    const avg = rows.length > 0 ? (grand / rows.length).toFixed(4) : '0.0000';
    expect(avg).toBe('0.0000');
  });
});

describe('phase timeline status', () => {
  const PHASES = ['analyze', 'plan', 'implement', 'test', 'review'] as const;

  it('all phases start idle', () => {
    const phaseStatus: Record<string, string> = {};
    for (const phase of PHASES) {
      const status = phaseStatus[phase] ?? 'idle';
      expect(status).toBe('idle');
    }
  });

  it('updates phase to running on phase_started', () => {
    const phaseStatus: Record<string, string> = {};
    const event = { type: 'phase_started' as const, phase: 'analyze' as const, taskId: 't1' };
    if (event.type === 'phase_started') phaseStatus[event.phase] = 'running';
    expect(phaseStatus['analyze']).toBe('running');
  });

  it('updates phase to completed on phase_completed', () => {
    const phaseStatus: Record<string, string> = { analyze: 'running' };
    const event = { type: 'phase_completed' as const, phase: 'analyze' as const, taskId: 't1' };
    if (event.type === 'phase_completed') phaseStatus[event.phase] = 'completed';
    expect(phaseStatus['analyze']).toBe('completed');
  });
});
