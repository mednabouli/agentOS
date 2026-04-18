import { NextResponse } from 'next/server';
import { getRunner } from '../../../../../lib/task-runner.js';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const entry = getRunner(id);

  if (entry === undefined) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  entry.engine.approve(id);
  return NextResponse.json({ ok: true });
}
