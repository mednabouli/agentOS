import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowEngine } from '../workflow/index.js';
import type { TaskNode, WorkflowEvent, CodebaseContext } from '../types/index.js';
import { StateManager } from '../state/index.js';

const MOCK_CONTEXT: CodebaseContext = {
  stack: ['TypeScript'],
  rootDir: '/test',
  folderStructure: 'src/',
  patterns: {},
};

function makeNodes(): TaskNode[] {
  return [
    {
      id: crypto.randomUUID(),
      role: 'orchestrator',
      phase: 'analyze',
      input: { prompt: 'analyze the codebase' },
      dependencies: [],
    },
    {
      id: crypto.randomUUID(),
      role: 'planner',
      phase: 'plan',
      input: { prompt: 'create a plan' },
      dependencies: [],
    },
  ];
}

vi.mock('../spawner/index.js', () => ({
  AgentSpawner: vi.fn().mockImplementation(() => ({
    spawn: vi.fn().mockResolvedValue({
      taskId: crypto.randomUUID(),
      status: 'success',
      artifacts: [],
      tokensUsed: 100,
      cost: 0.001,
    }),
  })),
}));

vi.mock('../state/index.js', () => ({
  StateManager: vi.fn().mockImplementation(() => ({
    saveCheckpoint: vi.fn().mockResolvedValue(undefined),
    loadCheckpoint: vi.fn().mockResolvedValue(null),
    listCheckpoints: vi.fn().mockResolvedValue([]),
    deleteCheckpoints: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('WorkflowEngine', () => {
  beforeEach(() => {
    // static method on mock class — no-op but keeps tests isolated
    (StateManager as unknown as Record<string, unknown>)['resetAdapter'] = vi.fn();
  });

  it('emits human_approval_required at plan phase and blocks until approved', async () => {
    const engine = new WorkflowEngine({ context: MOCK_CONTEXT });
    const events: WorkflowEvent[] = [];
    engine.on('event', (e) => events.push(e));

    const nodes = makeNodes();
    const runPromise = engine.run(nodes);

    // vi.waitFor only retries when the callback THROWS — use expect() inside
    await vi.waitFor(() => {
      expect(events.some((e) => e.type === 'human_approval_required')).toBe(true);
    }, { timeout: 3000 });

    const approvalEvent = events.find((e) => e.type === 'human_approval_required');
    expect(approvalEvent).toBeDefined();
    if (approvalEvent?.type === 'human_approval_required') {
      engine.approve(approvalEvent.taskId);
    }

    await runPromise;

    expect(events.some((e) => e.type === 'task_completed')).toBe(true);
  }, 10_000);

  it('rejects task when approval is rejected', async () => {
    const engine = new WorkflowEngine({ context: MOCK_CONTEXT });
    const events: WorkflowEvent[] = [];
    engine.on('event', (e) => events.push(e));

    const nodes = makeNodes();
    const runPromise = engine.run(nodes);

    await vi.waitFor(() => {
      expect(events.some((e) => e.type === 'human_approval_required')).toBe(true);
    }, { timeout: 3000 });

    const approvalEvent = events.find((e) => e.type === 'human_approval_required');
    if (approvalEvent?.type === 'human_approval_required') {
      engine.reject(approvalEvent.taskId, 'bad plan');
    }

    await expect(runPromise).rejects.toThrow('bad plan');
    expect(events.some((e) => e.type === 'task_failed')).toBe(true);
  }, 10_000);

  it('exposes tracer', () => {
    const engine = new WorkflowEngine({ context: MOCK_CONTEXT });
    expect(engine.getTracer()).toBeDefined();
  });

  it('uses caller-supplied taskId when provided via WorkflowRunOptions', async () => {
    const engine = new WorkflowEngine({ context: MOCK_CONTEXT });
    const events: WorkflowEvent[] = [];
    engine.on('event', (e) => events.push(e));

    const fixedId = 'sidecar-task-id-from-rust';
    const nodes = makeNodes();
    const runPromise = engine.run(nodes, { taskId: fixedId });

    await vi.waitFor(() => {
      expect(events.some((e) => e.type === 'human_approval_required')).toBe(true);
    }, { timeout: 3000 });

    const gate = events.find((e) => e.type === 'human_approval_required');
    if (gate?.type === 'human_approval_required') {
      engine.approve(gate.taskId);
    }

    const returnedId = await runPromise;
    expect(returnedId).toBe(fixedId);
    expect(events.every((e) => 'taskId' in e ? e.taskId === fixedId : true)).toBe(true);
  }, 10_000);
});
