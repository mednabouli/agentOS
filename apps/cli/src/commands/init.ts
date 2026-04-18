import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RepoAnalyzer } from '@agentos/core';
import { bold, green, dim, yellow } from '../lib/format.js';

const CONFIG_TEMPLATE = [
  '# AgentOS configuration',
  '# Get your key at https://console.anthropic.com',
  '#',
  '# apiKey: sk-ant-...',
  '',
  '# Or set via environment variable: ANTHROPIC_API_KEY',
].join('\n');

export function runInit(rootDir: string): void {
  console.log(bold('AgentOS init\n'));

  const agentosDir = join(rootDir, '.agentOS');
  const stateDir = join(agentosDir, 'state');

  mkdirSync(stateDir, { recursive: true });
  console.log(green('✓') + '  Created .agentOS/state/');

  const configPath = join(agentosDir, 'config.yaml');
  if (!existsSync(configPath)) {
    writeFileSync(configPath, CONFIG_TEMPLATE, 'utf-8');
    console.log(green('✓') + '  Created .agentOS/config.yaml');
  } else {
    console.log(dim('·') + '  .agentOS/config.yaml already exists');
  }

  console.log('\n  Analyzing codebase...');
  const analyzer = new RepoAnalyzer(rootDir);
  const context = analyzer.analyze();

  const claudeMdPath = join(rootDir, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    analyzer.writeClaudeMd(context);
    console.log(green('✓') + '  Generated CLAUDE.md');
  } else {
    console.log(dim('·') + '  CLAUDE.md already exists (skipping)');
  }

  console.log(`\n  Detected stack: ${context.stack.join(', ')}`);

  if (process.env['ANTHROPIC_API_KEY'] === undefined) {
    console.log(
      '\n' +
        yellow('⚠') +
        '  ANTHROPIC_API_KEY not set.\n' +
        '   Set it in your shell or add apiKey to .agentOS/config.yaml',
    );
  } else {
    console.log(green('✓') + '  ANTHROPIC_API_KEY found in environment');
  }

  console.log('\n' + bold('Ready!') + '  Run: agentos run "your task description"');
}
