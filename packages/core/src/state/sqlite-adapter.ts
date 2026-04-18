import type { StateAdapter } from './index.js';
import type { PhaseCheckpoint, WorkflowPhase } from '../types/index.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

interface CheckpointRow {
  id: string;
  task_id: string;
  phase: string;
  state_json: string;
  created_at: string;
}

export function createSqliteAdapter(dbPath: string): StateAdapter {
  mkdirSync(dirname(dbPath), { recursive: true });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as unknown as typeof import('better-sqlite3');
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_checkpoints_task_id ON checkpoints(task_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_checkpoints_task_phase ON checkpoints(task_id, phase);
  `);

  const upsert = db.prepare<[string, string, string, string, string]>(`
    INSERT INTO checkpoints (id, task_id, phase, state_json, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(task_id, phase) DO UPDATE SET
      state_json = excluded.state_json,
      created_at = excluded.created_at
  `);

  const selectOne = db.prepare<[string, string], CheckpointRow>(`
    SELECT * FROM checkpoints WHERE task_id = ? AND phase = ?
  `);

  const selectAll = db.prepare<[string], CheckpointRow>(`
    SELECT * FROM checkpoints WHERE task_id = ? ORDER BY created_at ASC
  `);

  const deleteAll = db.prepare<[string]>(`
    DELETE FROM checkpoints WHERE task_id = ?
  `);

  function rowToCheckpoint(row: CheckpointRow): PhaseCheckpoint {
    return {
      id: row.id,
      taskId: row.task_id,
      phase: row.phase as WorkflowPhase,
      stateJson: row.state_json,
      createdAt: new Date(row.created_at),
    };
  }

  return {
    async saveCheckpoint(checkpoint: PhaseCheckpoint): Promise<void> {
      upsert.run(
        checkpoint.id,
        checkpoint.taskId,
        checkpoint.phase,
        checkpoint.stateJson,
        checkpoint.createdAt.toISOString(),
      );
    },

    async loadCheckpoint(taskId: string, phase: WorkflowPhase): Promise<PhaseCheckpoint | null> {
      const row = selectOne.get(taskId, phase);
      return row !== undefined ? rowToCheckpoint(row) : null;
    },

    async listCheckpoints(taskId: string): Promise<PhaseCheckpoint[]> {
      return selectAll.all(taskId).map(rowToCheckpoint);
    },

    async deleteCheckpoints(taskId: string): Promise<void> {
      deleteAll.run(taskId);
    },
  };
}
