'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PRDPage() {
  const router = useRouter();
  const [prd, setPrd] = useState('');
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  const launchFromPrd = async () => {
    const title = /^#\s+(.+)/m.exec(prd)?.[1]?.trim() ?? prd.slice(0, 60);
    setLaunching(true);
    setError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: title }),
      });
      const data = (await res.json()) as { taskId?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      if (data.taskId !== undefined) router.push(`/swarms/${data.taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLaunching(false);
    }
  };

  const sectionCount = (prd.match(/^##\s+/gm) ?? []).length;
  const wordCount = prd.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      <h1>PRD Parser</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h2>Paste your PRD</h2>
          <textarea
            value={prd}
            onChange={(e) => setPrd(e.target.value)}
            rows={20}
            placeholder={'# My Feature\n\n## Overview\n...\n\n## Requirements\n...'}
            style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
          />
        </div>

        <div>
          <div className="card">
            <h2>Document Stats</h2>
            <table>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Words</td>
                  <td>{wordCount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Sections</td>
                  <td>{sectionCount}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Characters</td>
                  <td>{prd.length.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Detected Sections</h2>
            {prd.trim().length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Paste a PRD to preview sections.</p>
            ) : (
              <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
                {(prd.match(/^#{1,2}\s+.+/gm) ?? []).map((heading, i) => (
                  <li key={i} style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {heading.replace(/^#+\s+/, '')}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error !== '' && <div className="alert alert-error">{error}</div>}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={prd.trim().length === 0 || launching}
            onClick={launchFromPrd}
          >
            {launching ? 'Starting…' : '⚡ Launch Swarm from PRD'}
          </button>
        </div>
      </div>
    </>
  );
}
