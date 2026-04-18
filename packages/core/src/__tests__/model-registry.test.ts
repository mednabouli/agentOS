import { describe, it, expect } from 'vitest';
import { getModelConfig, calculateCost, MODEL_REGISTRY } from '../config/model-registry.js';
import type { AgentRole } from '../types/index.js';

describe('getModelConfig', () => {
  it('returns config for each role', () => {
    const roles: AgentRole[] = ['orchestrator', 'planner', 'developer', 'tester', 'reviewer', 'debugger'];
    for (const role of roles) {
      const config = getModelConfig(role);
      expect(config.model).toBeTruthy();
      expect(config.thinkingBudget).toBeGreaterThanOrEqual(0);
      expect(config.inputCostPerMillion).toBeGreaterThan(0);
      expect(config.outputCostPerMillion).toBeGreaterThan(0);
    }
  });

  it('orchestrator has the highest thinking budget', () => {
    const orch = getModelConfig('orchestrator');
    const dev = getModelConfig('developer');
    expect(orch.thinkingBudget).toBeGreaterThan(dev.thinkingBudget);
  });

  it('reviewer has zero thinking budget', () => {
    expect(getModelConfig('reviewer').thinkingBudget).toBe(0);
  });
});

describe('calculateCost', () => {
  it('returns zero for zero tokens', () => {
    expect(calculateCost('developer', 0, 0)).toBe(0);
  });

  it('calculates cost proportionally', () => {
    const cost1M = calculateCost('developer', 1_000_000, 0);
    const config = getModelConfig('developer');
    expect(cost1M).toBeCloseTo(config.inputCostPerMillion, 5);
  });

  it('adds input and output costs', () => {
    const inputOnly = calculateCost('developer', 1_000_000, 0);
    const outputOnly = calculateCost('developer', 0, 1_000_000);
    const combined = calculateCost('developer', 1_000_000, 1_000_000);
    expect(combined).toBeCloseTo(inputOnly + outputOnly, 10);
  });

  it('orchestrator costs more than haiku per token', () => {
    const orchCost = calculateCost('orchestrator', 1000, 1000);
    const haikusCost = calculateCost('tester', 1000, 1000);
    expect(orchCost).toBeGreaterThan(haikusCost);
  });
});

describe('MODEL_REGISTRY', () => {
  it('has all 6 roles', () => {
    const roles: AgentRole[] = ['orchestrator', 'planner', 'developer', 'tester', 'reviewer', 'debugger'];
    for (const role of roles) {
      expect(MODEL_REGISTRY[role]).toBeDefined();
    }
  });
});
