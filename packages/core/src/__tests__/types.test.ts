import { describe, it, expect } from 'vitest';
import {
  AgentRoleSchema,
  WorkflowPhaseSchema,
  AgentTaskSchema,
  AgentOutputSchema,
} from '../schemas/index.js';

describe('AgentRoleSchema', () => {
  it('accepts valid roles', () => {
    const roles = ['orchestrator', 'planner', 'developer', 'tester', 'reviewer', 'debugger'];
    for (const role of roles) {
      expect(AgentRoleSchema.parse(role)).toBe(role);
    }
  });

  it('rejects invalid role', () => {
    expect(() => AgentRoleSchema.parse('wizard')).toThrow();
  });
});

describe('WorkflowPhaseSchema', () => {
  it('accepts all phases', () => {
    const phases = ['analyze', 'plan', 'implement', 'test', 'review'];
    for (const phase of phases) {
      expect(WorkflowPhaseSchema.parse(phase)).toBe(phase);
    }
  });

  it('rejects unknown phase', () => {
    expect(() => WorkflowPhaseSchema.parse('deploy')).toThrow();
  });
});

describe('AgentTaskSchema', () => {
  it('parses a valid task', () => {
    const task = {
      id: crypto.randomUUID(),
      role: 'developer',
      input: { prompt: 'Build auth system' },
      context: {
        stack: ['Next.js', 'Supabase'],
        rootDir: '/app',
        folderStructure: 'src/',
        patterns: {},
      },
      tokenBudget: 16000,
      phase: 'implement',
    };
    const result = AgentTaskSchema.parse(task);
    expect(result.role).toBe('developer');
    expect(result.tokenBudget).toBe(16000);
  });

  it('rejects task with empty prompt', () => {
    expect(() =>
      AgentTaskSchema.parse({
        id: crypto.randomUUID(),
        role: 'developer',
        input: { prompt: '' },
        context: { stack: [], rootDir: '/', folderStructure: '', patterns: {} },
        tokenBudget: 100,
        phase: 'implement',
      }),
    ).toThrow();
  });
});

describe('AgentOutputSchema', () => {
  it('parses a valid output', () => {
    const output = {
      taskId: crypto.randomUUID(),
      status: 'success',
      artifacts: [],
      tokensUsed: 1000,
      cost: 0.003,
    };
    expect(AgentOutputSchema.parse(output).status).toBe('success');
  });
});
