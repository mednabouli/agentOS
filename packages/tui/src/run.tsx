import React from 'react';
import { render } from 'ink';
import type { WorkflowEngine, TaskNode, WorkflowRunOptions } from '@agentos/core';
import { App } from './app.js';

export async function runTui(
  engine: WorkflowEngine,
  nodes: TaskNode[],
  opts?: WorkflowRunOptions,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const { waitUntilExit } = render(
      <App
        engine={engine}
        nodes={nodes}
        opts={opts}
        onComplete={resolve}
        onError={reject}
      />,
    );

    waitUntilExit().catch(reject);
  });
}
