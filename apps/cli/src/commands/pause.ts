import { loadConfig } from '../lib/config.js';
import { loadActiveTask } from '../lib/active-task.js';
import { yellow, dim } from '../lib/format.js';

export function runPause(rootDir: string): void {
  const config = loadConfig(rootDir);
  const active = loadActiveTask(config.stateDir);

  if (active === null) {
    console.log(dim('No active task to pause.'));
    return;
  }

  console.log(
    yellow('⚠') +
      '  The swarm is running inside the TUI.\n' +
      '  Press ' +
      yellow('p') +
      ' inside the TUI to pause, or ' +
      yellow('q') +
      ' to quit (state is checkpointed).\n' +
      '  Resume later with: agentos resume',
  );
}
