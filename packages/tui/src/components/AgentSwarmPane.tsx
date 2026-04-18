import React from 'react';
import { Box, Text } from 'ink';
import type { AgentEntry } from '../state.js';

const ROLE_ICON: Record<string, string> = {
  orchestrator: '🧠',
  planner: '📋',
  developer: '⚡',
  tester: '🧪',
  reviewer: '👁 ',
  debugger: '🔍',
};

interface Props {
  agents: AgentEntry[];
}

export function AgentSwarmPane({ agents }: Props): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      flexGrow={1}
    >
      <Text bold color="cyan">
        Agent Swarm
      </Text>
      {agents.length === 0 ? (
        <Text dimColor>No agents spawned yet</Text>
      ) : (
        agents.map((agent) => {
          const icon = ROLE_ICON[agent.role] ?? '• ';
          return (
            <Text key={agent.id}>
              {icon} {agent.role}
              <Text dimColor> ({agent.phase})</Text>
            </Text>
          );
        })
      )}
    </Box>
  );
}
