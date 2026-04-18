import React from 'react';
import { Box, Text } from 'ink';
import type { AgentRole } from '@agentos/core';
import type { TokenEntry } from '../state.js';

const DISPLAY_ROLES: AgentRole[] = [
  'orchestrator',
  'planner',
  'developer',
  'tester',
  'debugger',
];

function bar(used: number, budget: number): string {
  if (budget === 0) return '';
  const pct = Math.min(1, used / budget);
  const filled = Math.round(pct * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

interface Props {
  tokenUsage: Partial<Record<AgentRole, TokenEntry>>;
  totalCost: number;
}

export function TokenBudgetPane({ tokenUsage, totalCost }: Props): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="yellow"
      paddingX={1}
      flexGrow={1}
    >
      <Text bold color="yellow">
        Token Budget
      </Text>
      {DISPLAY_ROLES.map((role) => {
        const entry = tokenUsage[role];
        if (entry === undefined || entry.thinkingBudget === 0) return null;
        return (
          <Text key={role}>
            <Text>{role.padEnd(13)}</Text>
            <Text color="cyan">{fmt(entry.thinkingTokens).padStart(6)}</Text>
            <Text dimColor> / {fmt(entry.thinkingBudget)}</Text>
            {'  '}
            <Text color="cyan">{bar(entry.thinkingTokens, entry.thinkingBudget)}</Text>
          </Text>
        );
      })}
      {DISPLAY_ROLES.every(
        (r) => tokenUsage[r] === undefined || tokenUsage[r]?.thinkingBudget === 0,
      ) && <Text dimColor>No usage yet</Text>}
      <Text>{' '}</Text>
      <Text>
        Total cost: <Text color="green">${totalCost.toFixed(4)}</Text>
      </Text>
    </Box>
  );
}
