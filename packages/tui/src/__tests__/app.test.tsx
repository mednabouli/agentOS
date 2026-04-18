import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink';
import { PassThrough } from 'node:stream';
import { App } from '../app.js';
import type { WorkflowEngine, TaskNode } from '@agentos/core';

function makeStdout(): NodeJS.WriteStream {
  return new PassThrough() as unknown as NodeJS.WriteStream;
}

function makeEngine(): WorkflowEngine {
  return {
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue('task-123'),
    approve: vi.fn(),
    reject: vi.fn(),
    getTracer: vi.fn(),
  } as unknown as WorkflowEngine;
}

const NO_NODES: TaskNode[] = [];

describe('App', () => {
  it('renders without crashing', () => {
    const engine = makeEngine();

    const { unmount } = render(
      <App
        engine={engine}
        nodes={NO_NODES}
        onComplete={vi.fn()}
        onError={vi.fn()}
      />,
      { stdout: makeStdout() },
    );

    unmount();
  });

  it('subscribes to engine events on mount', async () => {
    const engine = makeEngine();

    const { unmount } = render(
      <App
        engine={engine}
        nodes={NO_NODES}
        onComplete={vi.fn()}
        onError={vi.fn()}
      />,
      { stdout: makeStdout() },
    );

    await vi.waitFor(() => {
      expect(engine.on).toHaveBeenCalledWith('event', expect.any(Function));
    });
    unmount();
  });

  it('calls onComplete when engine.run resolves', async () => {
    const engine = makeEngine();
    const onComplete = vi.fn();

    const { unmount } = render(
      <App
        engine={engine}
        nodes={NO_NODES}
        onComplete={onComplete}
        onError={vi.fn()}
      />,
      { stdout: makeStdout() },
    );

    await vi.waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('task-123');
    });

    unmount();
  });

  it('calls onError when engine.run rejects', async () => {
    const failEngine = {
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
      run: vi.fn().mockRejectedValue(new Error('spawn failed')),
      approve: vi.fn(),
      reject: vi.fn(),
      getTracer: vi.fn(),
    } as unknown as WorkflowEngine;
    const onError = vi.fn();

    const { unmount } = render(
      <App
        engine={failEngine}
        nodes={NO_NODES}
        onComplete={vi.fn()}
        onError={onError}
      />,
      { stdout: makeStdout() },
    );

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'spawn failed' }),
      );
    });

    unmount();
  });
});
