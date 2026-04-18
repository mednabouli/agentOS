import type { PhaseCheckpoint, WorkflowPhase } from '../types/index.js';
import { generateId } from '../utils/id.js';
import { logger } from '../utils/logger.js';
import { StateError } from '../utils/errors.js';

export interface StateAdapter {
  saveCheckpoint(checkpoint: PhaseCheckpoint): Promise<void>;
  loadCheckpoint(taskId: string, phase: WorkflowPhase): Promise<PhaseCheckpoint | null>;
  listCheckpoints(taskId: string): Promise<PhaseCheckpoint[]>;
  deleteCheckpoints(taskId: string): Promise<void>;
}

let _adapter: StateAdapter | null = null;

async function getAdapter(): Promise<StateAdapter> {
  if (_adapter !== null) return _adapter;

  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_ANON_KEY'];

  if (supabaseUrl !== undefined && supabaseUrl.length > 0 &&
      supabaseKey !== undefined && supabaseKey.length > 0) {
    const { createSupabaseAdapter } = await import('./supabase-adapter.js');
    _adapter = createSupabaseAdapter(supabaseUrl, supabaseKey);
    logger.info('StateManager: using Supabase backend');
  } else {
    const { createSqliteAdapter } = await import('./sqlite-adapter.js');
    const dbPath = process.env['AGENTOS_STATE_DIR'] ?? '.agentOS/state';
    _adapter = createSqliteAdapter(`${dbPath}/agentos.db`);
    logger.info('StateManager: using SQLite backend', { dbPath });
  }

  return _adapter;
}

export class StateManager {
  async saveCheckpoint(
    taskId: string,
    phase: WorkflowPhase,
    state: unknown,
  ): Promise<PhaseCheckpoint> {
    const adapter = await getAdapter();
    const checkpoint: PhaseCheckpoint = {
      id: generateId(),
      taskId,
      phase,
      stateJson: JSON.stringify(state),
      createdAt: new Date(),
    };

    try {
      await adapter.saveCheckpoint(checkpoint);
      logger.debug('Checkpoint saved', { taskId, phase });
      return checkpoint;
    } catch (err) {
      throw new StateError(`Failed to save checkpoint for task ${taskId} phase ${phase}`, err);
    }
  }

  async loadCheckpoint(
    taskId: string,
    phase: WorkflowPhase,
  ): Promise<PhaseCheckpoint | null> {
    const adapter = await getAdapter();
    try {
      return await adapter.loadCheckpoint(taskId, phase);
    } catch (err) {
      throw new StateError(`Failed to load checkpoint for task ${taskId} phase ${phase}`, err);
    }
  }

  async listCheckpoints(taskId: string): Promise<PhaseCheckpoint[]> {
    const adapter = await getAdapter();
    try {
      return await adapter.listCheckpoints(taskId);
    } catch (err) {
      throw new StateError(`Failed to list checkpoints for task ${taskId}`, err);
    }
  }

  async deleteCheckpoints(taskId: string): Promise<void> {
    const adapter = await getAdapter();
    try {
      await adapter.deleteCheckpoints(taskId);
    } catch (err) {
      throw new StateError(`Failed to delete checkpoints for task ${taskId}`, err);
    }
  }

  /** Reset the cached adapter (useful in tests) */
  static resetAdapter(): void {
    _adapter = null;
  }
}
