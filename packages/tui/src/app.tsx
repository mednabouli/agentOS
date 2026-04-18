import React, { useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { WorkflowEngine, TaskNode, WorkflowRunOptions } from '@agentos/core';
import { useWorkflowState } from './hooks/use-workflow-state.js';
import { OrchestratorPane } from './components/OrchestratorPane.js';
import { AgentSwarmPane } from './components/AgentSwarmPane.js';
import { TokenBudgetPane } from './components/TokenBudgetPane.js';
import { LiveLogsPane } from './components/LiveLogsPane.js';
import { PhaseGatePane } from './components/PhaseGatePane.js';

export interface AppProps {
  engine: WorkflowEngine;
  nodes: TaskNode[];
  opts?: WorkflowRunOptions | undefined;
  onComplete: (taskId: string) => void;
  onError: (err: Error) => void;
}

export function App({
  engine,
  nodes,
  opts,
  onComplete,
  onError,
}: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [state, dispatch] = useWorkflowState(engine);

  useEffect(() => {
    // engine and nodes are stable for the TUI's lifetime — intentional empty deps
    engine
      .run(nodes, opts)
      .then((taskId) => {
        onComplete(taskId);
        exit();
      })
      .catch((err: unknown) => {
        onError(err instanceof Error ? err : new Error(String(err)));
        exit();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInput((input) => {
    if (state.pendingApproval !== null) {
      if (input === 'y') engine.approve(state.pendingApproval.taskId);
      if (input === 'n') engine.reject(state.pendingApproval.taskId, 'Rejected by user');
    }
    if (input === 'l') dispatch({ type: 'toggle_logs' });
    if (input === 'q') exit();
  });

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <OrchestratorPane
          currentPhase={state.currentPhase}
          phaseStatus={state.phaseStatus}
          completed={state.completed}
          failedReason={state.failedReason}
        />
        <AgentSwarmPane agents={state.agents} />
      </Box>
      <Box flexDirection="row">
        <TokenBudgetPane tokenUsage={state.tokenUsage} totalCost={state.totalCost} />
        <LiveLogsPane logs={state.logs} visible={state.showLogs} />
      </Box>
      {state.pendingApproval !== null && (
        <PhaseGatePane approval={state.pendingApproval} />
      )}
      <Box paddingX={1}>
        <Text dimColor>[y/n] approve/reject  [l] toggle logs  [q] quit</Text>
      </Box>
    </Box>
  );
}
