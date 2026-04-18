import type { NextRequest } from 'next/server';
import { getRunner } from '../../../../../lib/task-runner.js';
import type { WorkflowEvent } from '@agentos/core';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const entry = getRunner(id);

  if (entry === undefined) {
    return new Response('Task not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: WorkflowEvent): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // Replay buffered events to catch up
      for (const event of entry.events) {
        send(event);
      }

      if (entry.done) {
        controller.close();
        return;
      }

      const listener = (event: WorkflowEvent): void => {
        send(event);
        if (event.type === 'task_completed' || event.type === 'task_failed') {
          setTimeout(() => {
            try { controller.close(); } catch { /* already closed */ }
          }, 200);
        }
      };

      entry.listeners.push(listener);

      request.signal.addEventListener('abort', () => {
        const idx = entry.listeners.indexOf(listener);
        if (idx !== -1) entry.listeners.splice(idx, 1);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
