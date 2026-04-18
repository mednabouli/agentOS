import { MODEL_REGISTRY } from '@agentos/core';

export default function AgentsPage() {
  const entries = Object.entries(MODEL_REGISTRY);

  return (
    <>
      <h1>Agent Roles</h1>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Model</th>
              <th>Thinking Budget</th>
              <th>Input $/1M</th>
              <th>Output $/1M</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([role, cfg]) => (
              <tr key={role}>
                <td>
                  <span className="badge badge-running">{role}</span>
                </td>
                <td>
                  <code>{cfg.model}</code>
                </td>
                <td>
                  {cfg.thinkingBudget > 0
                    ? cfg.thinkingBudget.toLocaleString('en-US') + ' tokens'
                    : <span style={{ color: 'var(--text-muted)' }}>none</span>}
                </td>
                <td>${cfg.inputCostPerMillion.toFixed(2)}</td>
                <td>${cfg.outputCostPerMillion.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Workflow Phases</h2>
        <div className="phase-timeline" style={{ marginTop: 8 }}>
          {(['analyze', 'plan', 'implement', 'test', 'review'] as const).map((phase) => (
            <div key={phase} className="phase-step">
              {phase}
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: 13 }}>
          Phase <strong>plan</strong> requires human approval before implementation begins.
        </p>
      </div>
    </>
  );
}
