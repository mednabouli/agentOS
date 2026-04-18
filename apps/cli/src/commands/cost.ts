import { StateManager } from '@agentos/core';
import { loadConfig } from '../lib/config.js';
import { loadActiveTask } from '../lib/active-task.js';
import { bold, dim, green } from '../lib/format.js';

export async function runCost(args: string[], rootDir: string): Promise<void> {
  const config = loadConfig(rootDir);
  const taskId = args[0] ?? loadActiveTask(config.stateDir)?.taskId;

  if (taskId === undefined) {
    console.log(
      dim('No task ID.') + '  Provide one: agentos cost <task-id>\n' +
        '  Or run a task first: agentos run "your task"',
    );
    return;
  }

  process.env['AGENTOS_STATE_DIR'] = config.stateDir;
  const sm = new StateManager();
  const checkpoints = await sm.listCheckpoints(taskId);

  if (checkpoints.length === 0) {
    console.log(dim(`No cost data found for task ${taskId}`));
    return;
  }

  console.log(bold(`Cost breakdown for task: ${taskId}\n`));

  let prevCost = 0;
  for (const cp of checkpoints) {
    const state = JSON.parse(cp.stateJson) as Record<string, unknown>;
    const cumCost = typeof state['cost'] === 'number' ? state['cost'] : 0;
    const phaseCost = cumCost - prevCost;
    console.log(`  ${cp.phase.padEnd(12)}  $${phaseCost.toFixed(5)}`);
    prevCost = cumCost;
  }

  const totalCost = prevCost;
  console.log(`\n  ${bold('Total')}         ${green('$' + totalCost.toFixed(4))}`);
}
