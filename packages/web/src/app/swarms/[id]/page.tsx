'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { WorkflowEvent, WorkflowPhase } from '@agentos/core';

const PHASES: WorkflowPhase[] = ['analyze', 'plan', 'implement', 'test', 'review'];

type PhaseStatus = 'idle' | 'running' | 'completed' | 'failed';

interface ApprovalRequest {
  taskId: string;
  phase: WorkflowPhase;
  summary: string;
}

export default function SwarmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [phaseStatus, setPhaseStatus] = useState<Record<string, PhaseStatus>>({});
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const src = new EventSource(`/api/tasks/${id}/stream`);

    src.onmessage = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as WorkflowEvent;

      setEvents((prev) => [...prev, event]);

      setPhaseStatus((prev) => {
        if (event.type === 'phase_started') return { ...prev, [event.phase]: 'running' };
        if (event.type === 'phase_completed') return { ...prev, [event.phase]: 'completed' };
        if (event.type === 'phase_failed') return { ...prev, [event.phase]: 'failed' };
        return prev;
      });

      if (event.type === 'human_approval_required') {
        setPendingApproval({ taskId: event.taskId, phase: event.phase, summary: event.summary });
      }
      if (event.type === 'human_approved' || event.type === 'human_rejected') {
        setPendingApproval(null);
      }
      if (event.type === 'task_completed') {
        setDone(true);
        setTotalCost(event.totalCost);
        src.close();
      }
      if (event.type === 'task_failed') {
        setFailed(event.error);
        src.close();
      }
    };

    src.onerror = () => src.close();

    return () => src.close();
  }, [id]);

  const approve = async () => {
    if (pendingApproval === null) return;
    setApproving(true);
    await fetch(`/api/tasks/${id}/approve`, { method: 'POST' });
    setApproving(false);
  };

  const reject = async () => {
    if (pendingApproval === null) return;
    setApproving(true);
    await fetch(`/api/tasks/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Rejected via web UI' }),
    });
    setApproving(false);
  };

  return (
    <>
      <div className="page-header">
        <h1>Swarm <code style={{ fontSize: 16 }}>{id.slice(0, 12)}…</code></h1>
        {done && <span className="badge badge-completed">Completed · ${totalCost.toFixed(4)}</span>}
        {failed !== null && <span className="badge badge-failed">Failed</span>}
        {!done && failed === null && <span className="badge badge-running">Running</span>}
      </div>

      {/* Phase timeline */}
      <div className="card">
        <h2>Phase Progress</h2>
        <div className="phase-timeline">
          {PHASES.map((phase) => {
            const status = (phaseStatus[phase] as PhaseStatus | undefined) ?? 'idle';
            return (
              <div key={phase} className={`phase-step ${status}`}>
                {status === 'completed' && '✓ '}
                {status === 'running' && '⚡ '}
                {status === 'failed' && '✗ '}
                {phase}
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval gate */}
      {pendingApproval !== null && (
        <div className="card" style={{ borderColor: 'var(--yellow)', borderWidth: 2 }}>
          <h2 style={{ color: 'var(--yellow)' }}>⚠ Approval Required — {pendingApproval.phase}</h2>
          <pre
            style={{
              background: '#f8f9fa',
              padding: 12,
              borderRadius: 6,
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              margin: '12px 0',
            }}
          >
            {pendingApproval.summary}
          </pre>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-success" onClick={approve} disabled={approving}>
              ✓ Approve Plan
            </button>
            <button className="btn btn-danger" onClick={reject} disabled={approving}>
              ✗ Reject
            </button>
          </div>
        </div>
      )}

      {failed !== null && (
        <div className="alert alert-error">
          <strong>Task failed:</strong> {failed}
        </div>
      )}

      {/* Event log */}
      <div className="card">
        <h2>Event Log</h2>
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Waiting for events…</p>
        ) : (
          <div className="event-log">
            {events.map((e, i) => (
              <div key={i} className="event-row">
                <span className="event-ts">
                  {new Date().toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className={`event-type ${e.type}`}>{e.type}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {'phase' in e ? e.phase : ''}
                  {'error' in e ? ` — ${e.error}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
