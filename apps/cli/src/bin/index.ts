#!/usr/bin/env node
import { runInit } from '../commands/init.js';
import { runRun } from '../commands/run.js';
import { runStatus } from '../commands/status.js';
import { runLogs } from '../commands/logs.js';
import { runCost } from '../commands/cost.js';
import { runAgentsList } from '../commands/agents.js';
import { runPause } from '../commands/pause.js';
import { runResume } from '../commands/resume.js';
import { printHelp, red } from '../lib/format.js';

const [, , command, ...rest] = process.argv;

async function main(): Promise<void> {
  const rootDir = process.cwd();

  switch (command) {
    case 'init':
      runInit(rootDir);
      break;

    case 'run':
      await runRun(rest, rootDir);
      break;

    case 'status':
      await runStatus(rootDir);
      break;

    case 'logs':
      await runLogs(rest, rootDir);
      break;

    case 'cost':
      await runCost(rest, rootDir);
      break;

    case 'agents': {
      const sub = rest[0];
      if (sub === 'list') {
        runAgentsList();
      } else {
        console.error(red('Error:') + ` Unknown subcommand: agents ${sub ?? ''}`);
        console.error('  Usage: agentos agents list');
        process.exit(1);
      }
      break;
    }

    case 'pause':
      runPause(rootDir);
      break;

    case 'resume':
      await runResume(rootDir);
      break;

    case undefined:
    case '--help':
    case '-h':
    case 'help':
      printHelp();
      break;

    default:
      console.error(red('Error:') + ` Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(red('Error:'), err instanceof Error ? err.message : String(err));
  process.exit(1);
});
