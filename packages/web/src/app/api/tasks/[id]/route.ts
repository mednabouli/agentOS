import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db.js';
import { getRunner } from '../../../../lib/task-runner.js';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const db = getDb();
  const checkpoints = await db.listCheckpoints(id);
  const runner = getRunner(id);

  const state = runner !== undefined
    ? { running: !runner.done, prompt: runner.prompt, startedAt: runner.startedAt }
    : { running: false, prompt: null, startedAt: null };

  return NextResponse.json({ taskId: id, checkpoints, ...state });
}
