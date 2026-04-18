import { WorkflowEngine, PRDParser, RepoAnalyzer } from '@agentos/core';
import type { WorkflowEvent, WorkflowRunOptions } from '@agentos/core';

export interface RunnerEntry {
  engine: WorkflowEngine;
  events: WorkflowEvent[];
  listeners: Array<(e: WorkflowEvent) => void>;
  done: boolean;
  error: string | null;
  prompt: string;
  startedAt: Date;
}

declare global {
  // eslint-disable-next-line no-var
  var __agentosRunners: Map<string, RunnerEntry> | undefined;
}

// Survives Next.js hot-reload in dev via global cache
const runners: Map<string, RunnerEntry> = (global.__agentosRunners ??= new Map());

export function getRunner(taskId: string): RunnerEntry | undefined {
  return runners.get(taskId);
}

export function listRunnerIds(): string[] {
  return [...runners.keys()];
}

/**
 * Starts a WorkflowEngine in-process and registers it by its taskId.
 * The engine fires 'phase_started' synchronously before any await,
 * which sets the taskId via the event listener before this function returns.
 */
export function startTask(
  prompt: string,
  opts?: WorkflowRunOptions,
): string {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  const analyzer = new RepoAnalyzer(process.cwd());
  const context = analyzer.analyze();
  const engine = new WorkflowEngine({ apiKey, context });

  const parser = new PRDParser();
  const parsed = parser.parsePrompt(prompt);

  const entry: RunnerEntry = {
    engine,
    events: [],
    listeners: [],
    done: false,
    error: null,
    prompt,
    startedAt: new Date(),
  };

  let taskId: string | undefined;

  engine.on('event', (e) => {
    // First event carries the taskId — register in map
    if (taskId === undefined && 'taskId' in e) {
      taskId = e.taskId;
      runners.set(taskId, entry);
    }

    entry.events.push(e);

    for (const listener of [...entry.listeners]) {
      listener(e);
    }

    if (e.type === 'task_completed' || e.type === 'task_failed') {
      entry.done = true;
      if (e.type === 'task_failed') entry.error = e.error;
    }
  });

  // engine.run fires 'phase_started' synchronously before its first await,
  // which triggers the handler above and populates taskId immediately.
  void engine.run(parsed.tasks, opts);

  if (taskId === undefined) {
    throw new Error('WorkflowEngine did not fire initial event synchronously');
  }

  return taskId;
}
