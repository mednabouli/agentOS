import { createClient } from '@supabase/supabase-js';
import type { StateAdapter } from './index.js';
import type { PhaseCheckpoint, WorkflowPhase } from '../types/index.js';

interface CheckpointRecord {
  id: string;
  task_id: string;
  phase: string;
  state_json: string;
  created_at: string;
}

export function createSupabaseAdapter(url: string, anonKey: string): StateAdapter {
  const supabase = createClient(url, anonKey);

  function rowToCheckpoint(row: CheckpointRecord): PhaseCheckpoint {
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
      const { error } = await supabase.from('checkpoints').upsert({
        id: checkpoint.id,
        task_id: checkpoint.taskId,
        phase: checkpoint.phase,
        state_json: checkpoint.stateJson,
        created_at: checkpoint.createdAt.toISOString(),
      }, { onConflict: 'task_id,phase' });

      if (error !== null) throw new Error(error.message);
    },

    async loadCheckpoint(taskId: string, phase: WorkflowPhase): Promise<PhaseCheckpoint | null> {
      const { data, error } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('task_id', taskId)
        .eq('phase', phase)
        .maybeSingle<CheckpointRecord>();

      if (error !== null) throw new Error(error.message);
      return data !== null ? rowToCheckpoint(data) : null;
    },

    async listCheckpoints(taskId: string): Promise<PhaseCheckpoint[]> {
      const { data, error } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
        .returns<CheckpointRecord[]>();

      if (error !== null) throw new Error(error.message);
      return (data ?? []).map(rowToCheckpoint);
    },

    async deleteCheckpoints(taskId: string): Promise<void> {
      const { error } = await supabase
        .from('checkpoints')
        .delete()
        .eq('task_id', taskId);

      if (error !== null) throw new Error(error.message);
    },

    async listTaskIds(): Promise<string[]> {
      const { data, error } = await supabase
        .from('checkpoints')
        .select('task_id')
        .order('created_at', { ascending: false })
        .returns<Array<{ task_id: string }>>();

      if (error !== null) throw new Error(error.message);
      return [...new Set((data ?? []).map((r) => r.task_id))];
    },
  };
}
