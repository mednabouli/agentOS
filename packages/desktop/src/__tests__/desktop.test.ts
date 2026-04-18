import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  listTasks,
  startTask,
  approveTask,
  rejectTask,
  getConfig,
  saveConfig,
  spawnTerminal,
  writePty,
  resizePty,
  killPty,
  onPtyData,
  onWorkflowEvent,
} from '../lib/bridge';
import { colors, xtermTheme } from '../lib/theme';
import { DESKTOP_VERSION } from '../index';

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DESKTOP_VERSION', () => {
  it('is 2.0.0', () => {
    expect(DESKTOP_VERSION).toBe('2.0.0');
  });
});

describe('bridge — invoke wrappers', () => {
  it('listTasks calls list_tasks', async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const result = await listTasks();
    expect(mockInvoke).toHaveBeenCalledWith('list_tasks');
    expect(result).toEqual([]);
  });

  it('startTask passes prompt', async () => {
    mockInvoke.mockResolvedValueOnce('task-abc');
    const id = await startTask('Add payments');
    expect(mockInvoke).toHaveBeenCalledWith('start_task', { prompt: 'Add payments' });
    expect(id).toBe('task-abc');
  });

  it('approveTask passes taskId', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await approveTask('task-123');
    expect(mockInvoke).toHaveBeenCalledWith('approve_task', { taskId: 'task-123' });
  });

  it('rejectTask passes taskId and reason', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await rejectTask('task-123', 'Not good');
    expect(mockInvoke).toHaveBeenCalledWith('reject_task', { taskId: 'task-123', reason: 'Not good' });
  });

  it('getConfig calls get_config', async () => {
    const cfg = { anthropicKey: 'sk-test', logLevel: 'info', autoApprove: false, stateDir: '/tmp' };
    mockInvoke.mockResolvedValueOnce(cfg);
    const result = await getConfig();
    expect(mockInvoke).toHaveBeenCalledWith('get_config');
    expect(result).toEqual(cfg);
  });

  it('saveConfig passes config', async () => {
    const cfg = { anthropicKey: 'sk-test', logLevel: 'debug' as const, autoApprove: true, stateDir: '/tmp' };
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveConfig(cfg);
    expect(mockInvoke).toHaveBeenCalledWith('save_config', { config: cfg });
  });

  it('spawnTerminal passes cols and rows', async () => {
    mockInvoke.mockResolvedValueOnce('pty-uuid-1');
    const id = await spawnTerminal(80, 24);
    expect(mockInvoke).toHaveBeenCalledWith('spawn_terminal', { cols: 80, rows: 24 });
    expect(id).toBe('pty-uuid-1');
  });

  it('writePty passes id and data', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await writePty('pty-1', 'ls\n');
    expect(mockInvoke).toHaveBeenCalledWith('write_pty', { id: 'pty-1', data: 'ls\n' });
  });

  it('resizePty passes id, cols, rows', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await resizePty('pty-1', 120, 40);
    expect(mockInvoke).toHaveBeenCalledWith('resize_pty', { id: 'pty-1', cols: 120, rows: 40 });
  });

  it('killPty passes id', async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await killPty('pty-1');
    expect(mockInvoke).toHaveBeenCalledWith('kill_pty', { id: 'pty-1' });
  });
});

describe('bridge — event listeners', () => {
  it('onPtyData listens on correct channel', async () => {
    const handler = vi.fn();
    await onPtyData('pty-abc', handler);
    expect(mockListen).toHaveBeenCalledWith('pty:pty-abc:data', expect.any(Function));
  });

  it('onWorkflowEvent listens on workflow:event', async () => {
    const handler = vi.fn();
    await onWorkflowEvent(handler);
    expect(mockListen).toHaveBeenCalledWith('workflow:event', expect.any(Function));
  });
});

describe('theme', () => {
  it('exports required color constants', () => {
    expect(colors.bg).toBe('#0d1117');
    expect(colors.blue).toBe('#58a6ff');
    expect(colors.green).toBe('#3fb950');
    expect(colors.red).toBe('#f85149');
    expect(colors.yellow).toBe('#d29922');
  });

  it('xterm theme has background and foreground', () => {
    expect(xtermTheme.background).toBe('#0d1117');
    expect(xtermTheme.foreground).toBe('#e6edf3');
    expect(xtermTheme.cursor).toBe('#58a6ff');
  });
});

describe('useTauriEvents reducer logic', () => {
  type Phase = 'analyze' | 'plan' | 'implement' | 'test' | 'review';

  interface FakeState {
    currentPhase: string | null;
    activeTaskId: string | null;
    totalCost: number;
    pendingApproval: { taskId: string; phase: string; summary: string } | null;
  }

  function applyEvent(state: FakeState, event: Record<string, unknown>): FakeState {
    const next = { ...state };
    if (typeof event['taskId'] === 'string') next.activeTaskId = event['taskId'];
    if (event['type'] === 'phase_started') next.currentPhase = event['phase'] as string;
    if (event['type'] === 'phase_completed') next.currentPhase = null;
    if (event['type'] === 'task_completed') {
      next.currentPhase = null;
      next.totalCost = typeof event['totalCost'] === 'number' ? event['totalCost'] : state.totalCost;
    }
    if (event['type'] === 'human_approval_required') {
      next.pendingApproval = {
        taskId: event['taskId'] as string,
        phase: event['phase'] as string,
        summary: typeof event['summary'] === 'string' ? event['summary'] : '',
      };
    }
    if (event['type'] === 'human_approved' || event['type'] === 'human_rejected') {
      next.pendingApproval = null;
    }
    return next;
  }

  const initial: FakeState = { currentPhase: null, activeTaskId: null, totalCost: 0, pendingApproval: null };

  it('sets phase on phase_started', () => {
    const s = applyEvent(initial, { type: 'phase_started', phase: 'analyze', taskId: 't1' });
    expect(s.currentPhase).toBe('analyze');
    expect(s.activeTaskId).toBe('t1');
  });

  it('clears phase on phase_completed', () => {
    const s1 = applyEvent(initial, { type: 'phase_started', phase: 'plan', taskId: 't1' });
    const s2 = applyEvent(s1, { type: 'phase_completed', phase: 'plan', taskId: 't1' });
    expect(s2.currentPhase).toBeNull();
  });

  it('sets pending approval on human_approval_required', () => {
    const s = applyEvent(initial, {
      type: 'human_approval_required',
      taskId: 't1',
      phase: 'plan',
      summary: 'Create auth.ts',
    });
    expect(s.pendingApproval).toEqual({ taskId: 't1', phase: 'plan', summary: 'Create auth.ts' });
  });

  it('clears pending approval on human_approved', () => {
    const s1 = applyEvent(initial, {
      type: 'human_approval_required', taskId: 't1', phase: 'plan', summary: 'x',
    });
    const s2 = applyEvent(s1, { type: 'human_approved', taskId: 't1' });
    expect(s2.pendingApproval).toBeNull();
  });

  it('records total cost on task_completed', () => {
    const s = applyEvent(initial, { type: 'task_completed', taskId: 't1', totalCost: 0.1234 });
    expect(s.totalCost).toBe(0.1234);
    expect(s.currentPhase).toBeNull();
  });
});
