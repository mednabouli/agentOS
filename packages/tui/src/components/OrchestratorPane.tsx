import React from 'react';
import { Box, Text } from 'ink';
import type { WorkflowPhase } from '@agentos/core';
import type { PhaseRunStatus } from '../state.js';

const PHASES: WorkflowPhase[] = ['analyze', 'plan', 'implement', 'test', 'review'];

const STATUS_ICON: Record<PhaseRunStatus, string> = {
  idle: '  ',
  running: '⚡',
  completed: '✓ ',
  failed: '✗ ',
};

const STATUS_COLOR: Record<PhaseRunStatus, string> = {
  idle: 'gray',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
};

interface Props {
  currentPhase: WorkflowPhase | null;
  phaseStatus: Record<WorkflowPhase, PhaseRunStatus>;
  completed: boolean;
  failedReason: string | null;
}

export function OrchestratorPane({
  currentPhase,
  phaseStatus,
  completed,
  failedReason,
}: Props): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="blue"
      paddingX={1}
      flexGrow={1}
    >
      <Text bold color="blue">
        Orchestrator
      </Text>
      {PHASES.map((phase) => {
        const status = phaseStatus[phase];
        const icon = STATUS_ICON[status];
        const color = STATUS_COLOR[status];
        const suffix = status === 'running' ? '...' : '';
        return (
          <Text key={phase} color={color}>
            {icon}
            {phase}
            {suffix}
          </Text>
        );
      })}
      {completed && (
        <Text color="green" bold>
          {'\n'}Task complete
        </Text>
      )}
      {failedReason !== null && (
        <Text color="red">{'\n'}Failed: {failedReason}</Text>
      )}
      {currentPhase === null && !completed && failedReason === null && (
        <Text dimColor>Waiting to start...</Text>
      )}
    </Box>
  );
}
