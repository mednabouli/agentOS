import { getCurrentWindow } from '@tauri-apps/api/window';
import { colors } from '../lib/theme';

export function Titlebar() {
  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 38,
        background: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 80,
        paddingRight: 12,
        flexShrink: 0,
        cursor: 'default',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: 0.3 }}>
        AgentOS
        <span style={{ color: colors.textMuted, fontWeight: 400, marginLeft: 6 }}>v2.0</span>
      </span>

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          className="titlebar-btn"
          title="Minimize"
          onClick={() => { void win.minimize(); }}
        >
          ─
        </button>
        <button
          className="titlebar-btn"
          title="Maximize"
          onClick={() => { void win.toggleMaximize(); }}
        >
          □
        </button>
        <button
          className="titlebar-btn titlebar-btn-close"
          title="Close"
          onClick={() => { void win.close(); }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
