import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db.js';
import { startTask } from '../../../lib/task-runner.js';

export async function GET(): Promise<NextResponse> {
  const db = getDb();
  const taskIds = await db.listTaskIds();

  const tasks = await Promise.all(
    taskIds.slice(0, 50).map(async (taskId) => {
      const checkpoints = await db.listCheckpoints(taskId);
      const last = checkpoints.at(-1);
      const state =
        last !== undefined
          ? (JSON.parse(last.stateJson) as Record<string, unknown>)
          : {};
      const cost = typeof state['cost'] === 'number' ? state['cost'] : 0;
      return {
        taskId,
        phases: checkpoints.map((cp) => cp.phase),
        lastPhase: last?.phase ?? null,
        lastUpdate: last?.createdAt ?? null,
        totalCost: cost,
      };
    }),
  );

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as { prompt?: unknown };
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

  if (prompt.length === 0) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  if (process.env['ANTHROPIC_API_KEY'] === undefined) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not set on the server' },
      { status: 503 },
    );
  }

  try {
    const taskId = startTask(prompt);
    return NextResponse.json({ taskId }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
