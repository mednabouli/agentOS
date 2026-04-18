import { WorkflowEngine, RepoAnalyzer, StateManager } from '@agentos/core';
import type { WorkflowPhase } from '@agentos/core';
import { runTui } from '@agentos/tui';
import { loadConfig } from '../lib/config.js';
import { loadActiveTask, saveActiveTask } from '../lib/active-task.js';
import { bold, dim, red, green } from '../lib/format.js';

const PHASE_ORDER: WorkflowPhase[] = ['analyze', 'plan', 'implement', 'test', 'review'];

export async function runResume(rootDir: string): Promise<void> {
  const config = loadConfig(rootDir);

  if (config.apiKey === undefined) {
    console.error(
      red('Error:') + ' ANTHROPIC_API_KEY not set.\n' +
        '  Run ' + bold('agentos init') + ' then set your key in .agentOS/config.yaml',
    );
    process.exit(1);
  }

  const active = loadActiveTask(config.stateDir);
  if (active === null) {
    console.log(dim('No active task to resume.') + '\n  Run: agentos run "your task"');
    return;
  }

  process.env['AGENTOS_STATE_DIR'] = config.stateDir;
  const sm = new StateManager();
  const checkpoints = await sm.listCheckpoints(active.taskId);

  if (checkpoints.length === 0) {
    console.log(dim('No checkpoints found — starting from the beginning.'));
  }

  const lastPhase = checkpoints.at(-1)?.phase;
  const lastIdx = lastPhase !== undefined ? PHASE_ORDER.indexOf(lastPhase) : -1;
  const resumeFrom = PHASE_ORDER[lastIdx + 1];

  if (resumeFrom === undefined) {
    console.log(green('✓') + '  Task already completed all phases. Nothing to resume.');
    return;
  }

  console.log(bold(`Resuming task ${active.taskId} from phase: ${resumeFrom}\n`));

  const analyzer = new RepoAnalyzer(rootDir);
  const context = analyzer.analyze();
  const engine = new WorkflowEngine({ apiKey: config.apiKey, context });

  const taskId = await runTui(engine, active.nodes, { resumeFrom });

  saveActiveTask(config.stateDir, {
    ...active,
    taskId,
    startedAt: new Date().toISOString(),
  });
}
