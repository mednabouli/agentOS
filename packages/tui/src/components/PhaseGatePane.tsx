import React from 'react';
import { Box, Text } from 'ink';
import type { PendingApproval } from '../state.js';

interface Props {
  approval: PendingApproval;
}

export function PhaseGatePane({ approval }: Props): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={1}
    >
      <Text bold color="yellow">
        ⚠  Phase Gate — Approval Required
      </Text>
      <Text>
        Phase: <Text bold>{approval.phase}</Text>
      </Text>
      <Text>{' '}</Text>
      <Text bold>Plan:</Text>
      {approval.summary.split('\n').map((line, i) => (
        <Text key={i} color="white">
          {'  '}
          {line}
        </Text>
      ))}
      <Text>{' '}</Text>
      <Text>
        <Text color="green" bold>
          [y]
        </Text>
        {' Approve    '}
        <Text color="red" bold>
          [n]
        </Text>
        {' Reject'}
      </Text>
    </Box>
  );
}
