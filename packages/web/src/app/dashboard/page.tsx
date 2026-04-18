import Link from 'next/link';
import { getDb } from '../../lib/db.js';

export const dynamic = 'force-dynamic';

interface TaskRow {
  taskId: string;
  phases: string[];
  lastPhase: string | null;
  lastUpdate: Date | null;
  totalCost: number;
}

async function getTasks(): Promise<TaskRow[]> {
  const db = getDb();
  const taskIds = await db.listTaskIds();

  return Promise.all(
    taskIds.slice(0, 30).map(async (taskId) => {
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
}

export default async function DashboardPage() {
  const tasks = await getTasks();
  const totalCost = tasks.reduce((s, t) => s + t.totalCost, 0);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link href="/swarms/new" className="btn btn-primary">+ New Swarm</Link>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="label">Total Tasks</div>
          <div className="value">{tasks.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Spend</div>
          <div className="value">${totalCost.toFixed(3)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg Cost / Task</div>
          <div className="value">
            ${tasks.length > 0 ? (totalCost / tasks.length).toFixed(3) : '0.000'}
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty">
          <p>No tasks yet.</p>
          <Link href="/swarms/new" className="btn btn-primary">Launch your first swarm</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Last Phase</th>
                <th>Phases Done</th>
                <th>Last Update</th>
                <th>Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.taskId}>
                  <td><code>{t.taskId.slice(0, 12)}…</code></td>
                  <td>
                    {t.lastPhase !== null ? (
                      <span className={`badge badge-${t.phases.length === 5 ? 'completed' : 'running'}`}>
                        {t.lastPhase}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{t.phases.length} / 5</td>
                  <td>{t.lastUpdate !== null ? t.lastUpdate.toLocaleDateString() : '—'}</td>
                  <td>${t.totalCost.toFixed(4)}</td>
                  <td>
                    <Link href={`/swarms/${t.taskId}`} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
