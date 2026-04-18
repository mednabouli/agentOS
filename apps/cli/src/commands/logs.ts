import { StateManager } from '@agentos/core';
import { loadConfig } from '../lib/config.js';
import { loadActiveTask } from '../lib/active-task.js';
import { bold, green, dim, red } from '../lib/format.js';

export async function runLogs(args: string[], rootDir: string): Promise<void> {
  const config = loadConfig(rootDir);
  const taskId = args[0] ?? loadActiveTask(config.stateDir)?.taskId;

  if (taskId === undefined) {
    console.log(
      dim('No task ID.') + '  Provide one: agentos logs <task-id>\n' +
        '  Or run a task first: agentos run "your task"',
    );
    return;
  }

  process.env['AGENTOS_STATE_DIR'] = config.stateDir;
  const sm = new StateManager();
  const checkpoints = await sm.listCheckpoints(taskId);

  if (checkpoints.length === 0) {
    console.log(dim(`No checkpoints found for task ${taskId}`));
    return;
  }

  console.log(bold(`Logs for task: ${taskId}\n`));

  for (const cp of checkpoints) {
    const state = JSON.parse(cp.stateJson) as Record<string, unknown>;
    const cost = typeof state['cost'] === 'number' ? state['cost'] : null;
    const status = typeof state['outputStatus'] === 'string' ? state['outputStatus'] : 'unknown';
    const icon = status === 'success' ? green('✓') : red('✗');
    const ts = cp.createdAt.toLocaleTimeString('en-US', { hour12: false });

    console.log(
      `  ${icon}  [${ts}] ${cp.phase.padEnd(10)}` +
        (cost !== null ? `  $${cost.toFixed(4)}` : ''),
    );
  }
}
