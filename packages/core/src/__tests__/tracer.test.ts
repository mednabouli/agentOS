import { describe, it, expect, beforeEach } from 'vitest';
import { Tracer } from '../tracer/index.js';
import type { TokenUsage } from '../types/index.js';

const USAGE: TokenUsage = {
  inputTokens: 1000,
  outputTokens: 500,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  thinkingTokens: 0,
};

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer();
  });

  it('records a trace and returns it', () => {
    const record = tracer.record('task-1', 'developer', 'implement', USAGE, 1200);
    expect(record.taskId).toBe('task-1');
    expect(record.role).toBe('developer');
    expect(record.latencyMs).toBe(1200);
    expect(record.cost).toBeGreaterThan(0);
  });

  it('getRecordsForTask filters by taskId', () => {
    tracer.record('task-1', 'developer', 'implement', USAGE, 100);
    tracer.record('task-2', 'tester', 'test', USAGE, 200);
    expect(tracer.getRecordsForTask('task-1')).toHaveLength(1);
    expect(tracer.getRecordsForTask('task-2')).toHaveLength(1);
  });

  it('getTotalCost sums cost across records', () => {
    tracer.record('task-1', 'developer', 'implement', USAGE, 100);
    tracer.record('task-1', 'tester', 'test', USAGE, 100);
    const total = tracer.getTotalCost('task-1');
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(1); // sanity: < $1 for small token counts
  });

  it('getCostByRole groups by role', () => {
    tracer.record('task-1', 'developer', 'implement', USAGE, 100);
    tracer.record('task-1', 'tester', 'test', USAGE, 100);
    const byRole = tracer.getCostByRole('task-1');
    expect(byRole['developer']).toBeGreaterThan(0);
    expect(byRole['tester']).toBeGreaterThan(0);
  });

  it('getSummary returns all fields', () => {
    tracer.record('task-1', 'developer', 'implement', USAGE, 100);
    const summary = tracer.getSummary('task-1');
    expect(summary.totalCost).toBeGreaterThan(0);
    expect(summary.totalTokens).toBe(1500);
    expect(summary.records).toHaveLength(1);
  });

  it('clear removes records for a specific task', () => {
    tracer.record('task-1', 'developer', 'implement', USAGE, 100);
    tracer.record('task-2', 'tester', 'test', USAGE, 100);
    tracer.clear('task-1');
    expect(tracer.getRecordsForTask('task-1')).toHaveLength(0);
    expect(tracer.getRecordsForTask('task-2')).toHaveLength(1);
  });
});
