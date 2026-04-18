import { type NextRequest, NextResponse } from 'next/server';
import { getRunner } from '../../../../../lib/task-runner.js';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const entry = getRunner(id);

  if (entry === undefined) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
  const reason = typeof body.reason === 'string' ? body.reason : 'Rejected via web';

  entry.engine.reject(id, reason);
  return NextResponse.json({ ok: true });
}
