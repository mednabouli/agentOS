import { StateManager } from '@agentos/core';
import { loadConfig } from '../lib/config.js';
import { loadActiveTask } from '../lib/active-task.js';
import { bold, green, dim, yellow } from '../lib/format.js';

const PHASE_ORDER = ['analyze', 'plan', 'implement', 'test', 'review'] as const;

export async function runStatus(rootDir: string): Promise<void> {
  const config = loadConfig(rootDir);
  const active = loadActiveTask(config.stateDir);

  if (active === null) {
    console.log(dim('No active task found.') + '\n  Run: agentos run "your task"');
    return;
  }

  process.env['AGENTOS_STATE_DIR'] = config.stateDir;
  const sm = new StateManager();
  const checkpoints = await sm.listCheckpoints(active.taskId);
  const completedPhases = new Set(checkpoints.map((cp) => cp.phase));

  console.log(bold('AgentOS Status\n'));
  console.log(`  Task ID:  ${active.taskId}`);
  console.log(`  Prompt:   ${active.prompt}`);
  console.log(`  Started:  ${new Date(active.startedAt).toLocaleString()}`);
  console.log('');
  console.log(bold('  Phases:'));

  for (const phase of PHASE_ORDER) {
    const done = completedPhases.has(phase);
    const icon = done ? green('✓') : yellow('○');
    console.log(`    ${icon}  ${phase}`);
  }

  const lastCp = checkpoints.at(-1);
  if (lastCp !== undefined) {
    const state = JSON.parse(lastCp.stateJson) as Record<string, unknown>;
    const cost = typeof state['cost'] === 'number' ? state['cost'] : 0;
    console.log(`\n  Total cost so far: $${cost.toFixed(4)}`);
  }
}
