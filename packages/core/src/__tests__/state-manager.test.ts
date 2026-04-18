import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateManager } from '../state/index.js';
import { rmSync, existsSync } from 'node:fs';

const TEST_DB_DIR = '/tmp/agentos-test-state';
const TEST_DB = `${TEST_DB_DIR}/agentos.db`;

function hasSqlite(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DB = require('better-sqlite3') as unknown as typeof import('better-sqlite3');
    const db = new DB(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!hasSqlite())('StateManager (SQLite backend)', () => {
  beforeEach(() => {
    StateManager.resetAdapter();
    delete process.env['SUPABASE_URL'];
    delete process.env['SUPABASE_ANON_KEY'];
    process.env['AGENTOS_STATE_DIR'] = TEST_DB_DIR;
  });

  afterEach(() => {
    StateManager.resetAdapter();
    if (existsSync(TEST_DB)) {
      rmSync(TEST_DB, { force: true });
    }
  });

  it('saves and loads a checkpoint', async () => {
    const sm = new StateManager();
    const taskId = crypto.randomUUID();

    await sm.saveCheckpoint(taskId, 'analyze', { done: true });
    const cp = await sm.loadCheckpoint(taskId, 'analyze');

    expect(cp).not.toBeNull();
    expect(cp?.taskId).toBe(taskId);
    expect(cp?.phase).toBe('analyze');
    expect(JSON.parse(cp?.stateJson ?? '{}')).toEqual({ done: true });
  });

  it('upserts checkpoint on same task+phase', async () => {
    const sm = new StateManager();
    const taskId = crypto.randomUUID();

    await sm.saveCheckpoint(taskId, 'plan', { iteration: 1 });
    await sm.saveCheckpoint(taskId, 'plan', { iteration: 2 });
    const cp = await sm.loadCheckpoint(taskId, 'plan');

    expect(JSON.parse(cp?.stateJson ?? '{}')).toEqual({ iteration: 2 });
  });

  it('lists all checkpoints for a task', async () => {
    const sm = new StateManager();
    const taskId = crypto.randomUUID();

    await sm.saveCheckpoint(taskId, 'analyze', {});
    await sm.saveCheckpoint(taskId, 'plan', {});
    const cps = await sm.listCheckpoints(taskId);
    expect(cps).toHaveLength(2);
  });

  it('returns null for non-existent checkpoint', async () => {
    const sm = new StateManager();
    const result = await sm.loadCheckpoint('nonexistent-task', 'analyze');
    expect(result).toBeNull();
  });

  it('deletes all checkpoints for a task', async () => {
    const sm = new StateManager();
    const taskId = crypto.randomUUID();

    await sm.saveCheckpoint(taskId, 'analyze', {});
    await sm.saveCheckpoint(taskId, 'plan', {});
    await sm.deleteCheckpoints(taskId);

    const cps = await sm.listCheckpoints(taskId);
    expect(cps).toHaveLength(0);
  });
});
