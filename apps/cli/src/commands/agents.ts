import { MODEL_REGISTRY } from '@agentos/core';
import { bold, cyan, dim } from '../lib/format.js';

export function runAgentsList(): void {
  console.log(bold('Agent Roles\n'));
  console.log(
    '  ' +
      'Role'.padEnd(14) +
      'Model'.padEnd(22) +
      'Thinking Budget'.padEnd(20) +
      'Input $/1M',
  );
  console.log('  ' + '─'.repeat(68));

  for (const [role, cfg] of Object.entries(MODEL_REGISTRY)) {
    const budget =
      cfg.thinkingBudget > 0
        ? cfg.thinkingBudget.toLocaleString('en-US') + ' tokens'
        : dim('none');
    console.log(
      '  ' +
        cyan(role.padEnd(14)) +
        cfg.model.padEnd(22) +
        budget.padEnd(20) +
        `$${cfg.inputCostPerMillion.toFixed(2)}`,
    );
  }
}
