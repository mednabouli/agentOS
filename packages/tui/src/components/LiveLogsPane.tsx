import React from 'react';
import { Box, Text } from 'ink';

const VISIBLE_LINES = 8;

interface Props {
  logs: string[];
  visible: boolean;
}

export function LiveLogsPane({ logs, visible }: Props): React.ReactElement {
  if (!visible) {
    return (
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        flexGrow={1}
        alignItems="center"
      >
        <Text dimColor>[l] Show logs</Text>
      </Box>
    );
  }

  const recent = logs.slice(-VISIBLE_LINES);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      flexGrow={1}
    >
      <Text bold>Live Logs</Text>
      {recent.length === 0 ? (
        <Text dimColor>Waiting...</Text>
      ) : (
        recent.map((line, i) => (
          <Text key={i} dimColor>
            {line}
          </Text>
        ))
      )}
    </Box>
  );
}
