import * as readline from 'node:readline';
import { WorkflowEngine, PRDParser, RepoAnalyzer } from '@agentos/core';
import type { WorkflowEvent } from '@agentos/core';
import { loadConfig } from '../lib/config.js';
import { saveActiveTask } from '../lib/active-task.js';

function emit(event: WorkflowEvent): void {
  process.stdout.write(JSON.stringify(event) + '\n');
}

export async function runRunIpc(args: string[], rootDir: string): Promise<void> {
  const config = loadConfig(rootDir);

  if (config.apiKey === undefined) {
    process.stderr.write('ANTHROPIC_API_KEY not set\n');
    process.exit(1);
  }

  const taskIdIdx = args.findIndex((a) => a === '--task-id');
  const externalTaskId: string | undefined =
    taskIdIdx !== -1 ? args[taskIdIdx + 1] : undefined;

  const prdFlagIdx = args.findIndex((a) => a === '--prd' || a === '-p');
  const parser = new PRDParser();
  let prompt: string;
  let parsed: ReturnType<PRDParser['parsePrompt']>;

  if (prdFlagIdx !== -1) {
    const prdPath = args[prdFlagIdx + 1];
    if (prdPath === undefined || prdPath.startsWith('-')) {
      process.stderr.write('--prd requires a file path\n');
      process.exit(1);
    }
    parsed = parser.parseFile(prdPath);
    prompt = `prd:${prdPath}`;
  } else {
    prompt = args
      .filter((a) => !a.startsWith('-') && a !== args[taskIdIdx + 1])
      .join(' ')
      .trim();
    if (prompt.length === 0) {
      process.stderr.write('IPC mode requires a prompt\n');
      process.exit(1);
    }
    parsed = parser.parsePrompt(prompt);
  }

  process.env['AGENTOS_STATE_DIR'] = config.stateDir;

  const analyzer = new RepoAnalyzer(rootDir);
  const context = analyzer.analyze();
  const engine = new WorkflowEngine({ apiKey: config.apiKey, context });

  // Read approve/reject commands from stdin
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    try {
      const msg = JSON.parse(trimmed) as { action: string; taskId: string; reason?: string };
      if (msg.action === 'approve') {
        engine.approve(msg.taskId);
      } else if (msg.action === 'reject') {
        engine.reject(msg.taskId, msg.reason);
      }
    } catch {
      // ignore malformed lines
    }
  });

  engine.on('event', emit);

  try {
    const taskId = await engine.run(
      parsed.tasks,
      externalTaskId !== undefined ? { taskId: externalTaskId } : {},
    );
    saveActiveTask(config.stateDir, {
      taskId,
      startedAt: new Date().toISOString(),
      prompt,
      nodes: parsed.tasks,
    });
  } finally {
    rl.close();
  }
}
