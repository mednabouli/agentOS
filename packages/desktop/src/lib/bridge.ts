import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface TaskSummary {
  taskId: string;
  prompt: string;
  phase: string;
  cost: number;
  startedAt: string;
}

export interface AppConfig {
  anthropicKey: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  autoApprove: boolean;
  stateDir: string;
}

export interface PtyDataPayload {
  data: string;
}

export interface WorkflowEventPayload {
  type: string;
  taskId?: string;
  phase?: string;
  summary?: string;
  error?: string;
  totalCost?: number;
}

export async function listTasks(): Promise<TaskSummary[]> {
  return invoke<TaskSummary[]>('list_tasks');
}

export async function startTask(prompt: string): Promise<string> {
  return invoke<string>('start_task', { prompt });
}

export async function approveTask(taskId: string): Promise<void> {
  return invoke<void>('approve_task', { taskId });
}

export async function rejectTask(taskId: string, reason: string): Promise<void> {
  return invoke<void>('reject_task', { taskId, reason });
}

export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('get_config');
}

export async function saveConfig(config: AppConfig): Promise<void> {
  return invoke<void>('save_config', { config });
}

export async function spawnTerminal(cols: number, rows: number): Promise<string> {
  return invoke<string>('spawn_terminal', { cols, rows });
}

export async function writePty(id: string, data: string): Promise<void> {
  return invoke<void>('write_pty', { id, data });
}

export async function resizePty(id: string, cols: number, rows: number): Promise<void> {
  return invoke<void>('resize_pty', { id, cols, rows });
}

export async function killPty(id: string): Promise<void> {
  return invoke<void>('kill_pty', { id });
}

export function onPtyData(id: string, handler: (data: string) => void): Promise<UnlistenFn> {
  return listen<PtyDataPayload>(`pty:${id}:data`, (e) => handler(e.payload.data));
}

export function onWorkflowEvent(handler: (event: WorkflowEventPayload) => void): Promise<UnlistenFn> {
  return listen<WorkflowEventPayload>('workflow:event', (e) => handler(e.payload));
}
