import { getDb } from '../../lib/db.js';

export const dynamic = 'force-dynamic';

export default async function CostsPage() {
  const db = getDb();
  const taskIds = await db.listTaskIds();

  const rows = await Promise.all(
    taskIds.slice(0, 50).map(async (taskId) => {
      const checkpoints = await db.listCheckpoints(taskId);
      const phaseCosts: Record<string, number> = {};
      let prevCost = 0;

      for (const cp of checkpoints) {
        const state = JSON.parse(cp.stateJson) as Record<string, unknown>;
        const cum = typeof state['cost'] === 'number' ? state['cost'] : prevCost;
        phaseCosts[cp.phase] = cum - prevCost;
        prevCost = cum;
      }

      return { taskId, phaseCosts, totalCost: prevCost };
    }),
  );

  const grandTotal = rows.reduce((s, r) => s + r.totalCost, 0);
  const phases = ['analyze', 'plan', 'implement', 'test', 'review'] as const;

  return (
    <>
      <h1>Cost Breakdown</h1>

      <div className="card-grid">
        <div className="stat-card">
          <div className="label">Grand Total</div>
          <div className="value">${grandTotal.toFixed(4)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Tasks</div>
          <div className="value">{rows.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Avg / Task</div>
          <div className="value">
            ${rows.length > 0 ? (grandTotal / rows.length).toFixed(4) : '0.0000'}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty"><p>No cost data yet.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                {phases.map((p) => <th key={p}>{p}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.taskId}>
                  <td><code>{r.taskId.slice(0, 10)}…</code></td>
                  {phases.map((p) => (
                    <td key={p} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r.phaseCosts[p] !== undefined
                        ? `$${r.phaseCosts[p].toFixed(5)}`
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  ))}
                  <td style={{ fontWeight: 600 }}>${r.totalCost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
