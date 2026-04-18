'use client';

import { useState } from 'react';
import { BUILT_IN_TEMPLATES } from '@agentos/core';
import type { AgentTemplate } from '@agentos/core';

const ALL_TAGS = [...new Set(BUILT_IN_TEMPLATES.flatMap((t) => t.tags))].sort();

function TemplateCard({ template, onSelect }: { template: AgentTemplate; onSelect: () => void }) {
  return (
    <div
      className="template-card"
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-header">
        <h3 className="card-title">{template.name}</h3>
        <span className="card-version">v{template.version}</span>
      </div>
      <p className="card-description">{template.description}</p>
      <div className="card-meta">
        <span className="card-phases">
          {[...new Set(template.nodes.map((n) => n.phase))].join(' → ')}
        </span>
        <div className="card-tags">
          {template.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateDetail({ template, onClose }: { template: AgentTemplate; onClose: () => void }) {
  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <h2 className="detail-title">{template.name}</h2>
          <span className="detail-meta">v{template.version} · by {template.author}</span>
        </div>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>

      <p className="detail-description">{template.description}</p>

      <div className="detail-section">
        <h4>Variables</h4>
        {template.variables.length === 0 ? (
          <p className="muted">No variables required.</p>
        ) : (
          <table className="vars-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Required</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {template.variables.map((v) => (
                <tr key={v.name}>
                  <td><code>{v.name}</code></td>
                  <td>{v.description}</td>
                  <td>{v.required ? <span className="badge-req">required</span> : '—'}</td>
                  <td><code>{v.default ?? '—'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="detail-section">
        <h4>Agent Pipeline</h4>
        <ol className="pipeline-list">
          {template.nodes.map((node, i) => (
            <li key={i} className="pipeline-item">
              <span className="pipeline-phase">{node.phase}</span>
              <span className="pipeline-role">{node.role}</span>
              <span className="pipeline-prompt">{node.input.prompt.slice(0, 80)}…</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="detail-section cli-snippet">
        <h4>CLI Usage</h4>
        <pre>
          <code>
            {'agentos template use ' + template.id}
            {template.variables
              .filter((v) => v.required)
              .map((v) => ` \\\n  ${v.name}="<value>"`)
              .join('')}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentTemplate | null>(null);

  const filtered = BUILT_IN_TEMPLATES.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q));
    const matchesTag = activeTag === null || t.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Template Library</h1>
        <span className="page-subtitle">{BUILT_IN_TEMPLATES.length} built-in templates</span>
      </div>

      <div className="toolbar">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          placeholder="Search templates…"
          className="search-input"
        />
        <div className="tag-filters">
          <button
            onClick={() => { setActiveTag(null); }}
            className={`tag-btn${activeTag === null ? ' active' : ''}`}
          >
            All
          </button>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => { setActiveTag(activeTag === tag ? null : tag); }}
              className={`tag-btn${activeTag === tag ? ' active' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="templates-layout">
        <div className="templates-grid">
          {filtered.length === 0 && (
            <p className="muted">No templates match your search.</p>
          )}
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onSelect={() => { setSelected(t); }}
            />
          ))}
        </div>

        {selected !== null && (
          <TemplateDetail template={selected} onClose={() => { setSelected(null); }} />
        )}
      </div>
    </div>
  );
}
