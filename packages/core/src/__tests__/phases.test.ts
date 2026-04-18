import { describe, it, expect } from 'vitest';
import { PHASES, requiresApproval, nextPhase, isValidPhase } from '../config/phases.js';

describe('PHASES', () => {
  it('has 5 phases in correct order', () => {
    expect(PHASES).toEqual(['analyze', 'plan', 'implement', 'test', 'review']);
  });
});

describe('requiresApproval', () => {
  it('requires approval for plan phase only', () => {
    expect(requiresApproval('plan')).toBe(true);
    expect(requiresApproval('analyze')).toBe(false);
    expect(requiresApproval('implement')).toBe(false);
    expect(requiresApproval('test')).toBe(false);
    expect(requiresApproval('review')).toBe(false);
  });
});

describe('nextPhase', () => {
  it('returns the next phase in sequence', () => {
    expect(nextPhase('analyze')).toBe('plan');
    expect(nextPhase('plan')).toBe('implement');
    expect(nextPhase('implement')).toBe('test');
    expect(nextPhase('test')).toBe('review');
  });

  it('returns null for the last phase', () => {
    expect(nextPhase('review')).toBeNull();
  });
});

describe('isValidPhase', () => {
  it('returns true for valid phases', () => {
    for (const phase of PHASES) {
      expect(isValidPhase(phase)).toBe(true);
    }
  });

  it('returns false for invalid values', () => {
    expect(isValidPhase('deploy')).toBe(false);
    expect(isValidPhase(42)).toBe(false);
    expect(isValidPhase(null)).toBe(false);
  });
});
