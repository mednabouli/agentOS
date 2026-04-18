'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSwarmPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = (await res.json()) as { taskId?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Failed to start task');
        return;
      }

      if (data.taskId !== undefined) {
        router.push(`/swarms/${data.taskId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>New Swarm</h1>
      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="prompt">Task Description</label>
            <textarea
              id="prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Add Stripe payments to the checkout flow..."
              required
              style={{ resize: 'vertical' }}
            />
            <p className="hint">
              Describe what you want the agent swarm to build. Be specific about
              files, libraries, and expected behavior.
            </p>
          </div>

          {error !== '' && <div className="alert alert-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || prompt.trim().length === 0}
          >
            {loading ? 'Starting swarm…' : '⚡ Launch Swarm'}
          </button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <h3>What happens next</h3>
        <ol style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text-muted)' }}>
          <li>Orchestrator analyzes the task and codebase</li>
          <li>Planner generates a detailed implementation plan</li>
          <li><strong>You approve the plan</strong> before any code is written</li>
          <li>Developer implements the feature</li>
          <li>Tester writes and runs tests</li>
          <li>Reviewer checks code quality</li>
        </ol>
      </div>
    </>
  );
}
