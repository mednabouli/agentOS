'use client';

import { useState } from 'react';

interface SettingsState {
  anthropicKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoApprove: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    anthropicKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    autoApprove: false,
    logLevel: 'info',
  });
  const [saved, setSaved] = useState(false);

  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <h1>Settings</h1>

      <form onSubmit={save} style={{ maxWidth: 580 }}>
        <div className="card">
          <h2>API Keys</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Keys are stored only in your <code>.agentOS/config.yaml</code> and never sent to our servers.
          </p>

          <div className="form-group">
            <label htmlFor="anthropicKey">Anthropic API Key</label>
            <input
              id="anthropicKey"
              type="password"
              value={settings.anthropicKey}
              onChange={(e) => setSettings((s) => ({ ...s, anthropicKey: e.target.value }))}
              placeholder="sk-ant-…"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="supabaseUrl">Supabase URL</label>
            <input
              id="supabaseUrl"
              type="url"
              value={settings.supabaseUrl}
              onChange={(e) => setSettings((s) => ({ ...s, supabaseUrl: e.target.value }))}
              placeholder="https://xxxx.supabase.co"
            />
          </div>

          <div className="form-group">
            <label htmlFor="supabaseAnonKey">Supabase Anon Key</label>
            <input
              id="supabaseAnonKey"
              type="password"
              value={settings.supabaseAnonKey}
              onChange={(e) => setSettings((s) => ({ ...s, supabaseAnonKey: e.target.value }))}
              placeholder="eyJ…"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="card">
          <h2>Workflow</h2>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.autoApprove}
                onChange={(e) => setSettings((s) => ({ ...s, autoApprove: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              Auto-approve plan phase
            </label>
            <p className="hint">Skip the human approval gate. Not recommended for production.</p>
          </div>

          <div className="form-group">
            <label htmlFor="logLevel">Log Level</label>
            <select
              id="logLevel"
              value={settings.logLevel}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  logLevel: e.target.value as SettingsState['logLevel'],
                }))
              }
            >
              <option value="debug">debug</option>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" className="btn btn-primary">
            Save Settings
          </button>
          {saved && (
            <span style={{ color: 'var(--green)', fontSize: 13 }}>✓ Saved</span>
          )}
        </div>
      </form>
    </>
  );
}
