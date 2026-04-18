import { WorkflowEngine, PRDParser, RepoAnalyzer } from '@agentos/core';
import { runTui } from '@agentos/tui';
import { loadConfig } from '../lib/config.js';
import { saveActiveTask } from '../lib/active-task.js';
import { red, bold } from '../lib/format.js';

export async function runRun(args: string[], rootDir: string): Promise<void> {
  const config = loadConfig(rootDir);

  if (config.apiKey === undefined) {
    console.error(
      red('Error:') +
        ' ANTHROPIC_API_KEY not set.\n' +
        '  Run ' +
        bold('agentos init') +
        ' then set your key in .agentOS/config.yaml',
    );
    process.exit(1);
  }

  const prdFlagIdx = args.findIndex((a) => a === '--prd' || a === '-p');
  const parser = new PRDParser();
  let prompt: string;
  let parsed: ReturnType<PRDParser['parsePrompt']>;

  if (prdFlagIdx !== -1) {
    const prdPath = args[prdFlagIdx + 1];
    if (prdPath === undefined || prdPath.startsWith('-')) {
      console.error(red('Error:') + ' --prd requires a file path');
      process.exit(1);
    }
    parsed = parser.parseFile(prdPath);
    prompt = `prd:${prdPath}`;
  } else {
    prompt = args.filter((a) => !a.startsWith('-')).join(' ').trim();
    if (prompt.length === 0) {
      console.error(
        red('Error:') + ' run requires a prompt or --prd flag\n' +
          '  Usage: agentos run "your task"  |  agentos run --prd ./prd.md',
      );
      process.exit(1);
    }
    parsed = parser.parsePrompt(prompt);
  }

  process.env['AGENTOS_STATE_DIR'] = config.stateDir;

  const analyzer = new RepoAnalyzer(rootDir);
  const context = analyzer.analyze();

  const engine = new WorkflowEngine({ apiKey: config.apiKey, context });

  const taskId = await runTui(engine, parsed.tasks);

  saveActiveTask(config.stateDir, {
    taskId,
    startedAt: new Date().toISOString(),
    prompt,
    nodes: parsed.tasks,
  });
}
