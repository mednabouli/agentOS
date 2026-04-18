import { useState, useEffect, useCallback } from 'react';
import { listTasks, startTask, approveTask, rejectTask, type TaskSummary } from '../lib/bridge';
import type { TauriEventState } from '../hooks/useTauriEvents';
import { colors } from '../lib/theme';

export type DashboardView = 'tasks' | 'new' | 'approval';

interface DashboardPaneProps {
  view: DashboardView;
  onViewChange: (v: DashboardView) => void;
  taskState: TauriEventState;
}

function TaskList({ tasks, loading }: { tasks: TaskSummary[]; loading: boolean }) {
  if (loading) {
    return <p style={{ color: colors.textMuted, padding: 16 }}>Loading…</p>;
  }
  if (tasks.length === 0) {
    return <p style={{ color: colors.textMuted, padding: 16 }}>No tasks yet. Start a new swarm.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
          <th style={thStyle}>Task</th>
          <th style={thStyle}>Phase</th>
          <th style={thStyle}>Cost</th>
          <th style={thStyle}>Started</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.taskId} style={{ borderBottom: `1px solid ${colors.border}` }}>
            <td style={tdStyle}><code style={{ fontSize: 11 }}>{t.taskId.slice(0, 12)}…</code></td>
            <td style={tdStyle}>
              <span style={{ color: colors.blue, fontSize: 11 }}>{t.phase}</span>
            </td>
            <td style={tdStyle}>${t.cost.toFixed(4)}</td>
            <td style={{ ...tdStyle, color: colors.textMuted }}>
              {new Date(t.startedAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NewTaskForm({ onLaunched }: { onLaunched: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  const launch = async () => {
    if (prompt.trim().length === 0) return;
    setLaunching(true);
    setError('');
    try {
      await startTask(prompt.trim());
      setPrompt('');
      onLaunched();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{ fontSize: 12, color: colors.textMuted }}>Task Description</label>
      <textarea
        value={prompt}
        onChange={(e) => { setPrompt(e.target.value); }}
        rows={6}
        placeholder="Add Stripe payments to the checkout flow…"
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          color: colors.text,
          padding: '8px 10px',
          fontSize: 13,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
      {error !== '' && (
        <p style={{ color: colors.red, fontSize: 12 }}>{error}</p>
      )}
      <button
        disabled={prompt.trim().length === 0 || launching}
        onClick={() => { void launch(); }}
        style={{
          background: launching ? colors.bgHover : colors.blue,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '8px 16px',
          cursor: launching ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {launching ? 'Launching…' : '⚡ Launch Swarm'}
      </button>
    </div>
  );
}

function ApprovalPane({ taskState }: { taskState: TauriEventState }) {
  const { pendingApproval } = taskState;
  const [acting, setActing] = useState(false);

  if (pendingApproval === null) {
    return <p style={{ color: colors.textMuted, padding: 16 }}>No approval required.</p>;
  }

  const act = async (fn: () => Promise<void>) => {
    setActing(true);
    try { await fn(); } finally { setActing(false); }
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ color: colors.yellow, fontWeight: 600 }}>
        ⚠ Approval Required — {pendingApproval.phase}
      </p>
      <pre
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: 12,
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          color: colors.text,
          maxHeight: 300,
          overflow: 'auto',
        }}
      >
        {pendingApproval.summary}
      </pre>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled={acting}
          onClick={() => { void act(() => approveTask(pendingApproval.taskId)); }}
          style={actionBtn(colors.green)}
        >
          ✓ Approve Plan
        </button>
        <button
          disabled={acting}
          onClick={() => { void act(() => rejectTask(pendingApproval.taskId, 'Rejected via desktop')); }}
          style={actionBtn(colors.red)}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}

function actionBtn(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
  };
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  color: colors.textMuted,
  fontWeight: 500,
  fontSize: 11,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: colors.text,
};

export function DashboardPane({ view, onViewChange, taskState }: DashboardPaneProps) {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    listTasks()
      .then((t) => { setTasks(t); })
      .catch(() => { setTasks([]); })
      .finally(() => { setLoading(false); });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Re-fetch when a task completes
  useEffect(() => {
    if (taskState.currentPhase === null && taskState.activeTaskId !== null) {
      refresh();
    }
  }, [taskState.currentPhase, taskState.activeTaskId, refresh]);

  const hasPendingApproval = taskState.pendingApproval !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-nav */}
      <div
        style={{
          display: 'flex',
          gap: 1,
          background: colors.bgCard,
          borderBottom: `1px solid ${colors.border}`,
          padding: '0 8px',
        }}
      >
        {(['tasks', 'new', 'approval'] as const).map((v) => (
          <button
            key={v}
            onClick={() => { onViewChange(v); }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: view === v ? `2px solid ${colors.blue}` : '2px solid transparent',
              color: view === v ? colors.text : colors.textMuted,
              padding: '10px 14px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: view === v ? 600 : 400,
              position: 'relative',
            }}
          >
            {v === 'tasks' ? 'Tasks' : v === 'new' ? '+ New' : 'Approval'}
            {v === 'approval' && hasPendingApproval && (
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 6,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: colors.yellow,
                }}
              />
            )}
          </button>
        ))}
        <button
          onClick={refresh}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            padding: '10px 8px',
            fontSize: 12,
          }}
        >
          ↻
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'tasks' && <TaskList tasks={tasks} loading={loading} />}
        {view === 'new' && <NewTaskForm onLaunched={() => { onViewChange('tasks'); refresh(); }} />}
        {view === 'approval' && <ApprovalPane taskState={taskState} />}
      </div>
    </div>
  );
}
