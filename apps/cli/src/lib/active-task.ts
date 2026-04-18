import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { TaskNode } from '@agentos/core';

export interface ActiveTask {
  taskId: string;
  startedAt: string;
  prompt: string;
  nodes: TaskNode[];
}

export function saveActiveTask(stateDir: string, task: ActiveTask): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'active-task.json'), JSON.stringify(task, null, 2), 'utf-8');
}

export function loadActiveTask(stateDir: string): ActiveTask | null {
  const path = join(stateDir, 'active-task.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as ActiveTask;
  } catch {
    return null;
  }
}
