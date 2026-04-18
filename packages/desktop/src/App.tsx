import { useState, useRef, useCallback, useEffect } from 'react';
import { Titlebar } from './components/Titlebar';
import { DashboardPane, type DashboardView } from './components/DashboardPane';
import { TerminalPane } from './components/TerminalPane';
import { StatusBar } from './components/StatusBar';
import { useTauriEvents } from './hooks/useTauriEvents';
import { colors } from './lib/theme';

const NAV_ITEMS: Array<{ id: DashboardView; icon: string; label: string }> = [
  { id: 'tasks', icon: '◉', label: 'Dashboard' },
  { id: 'new', icon: '+', label: 'New Swarm' },
  { id: 'approval', icon: '⚠', label: 'Approval' },
];

const MIN_LEFT_RATIO = 0.25;
const MAX_LEFT_RATIO = 0.75;

export default function App() {
  const [view, setView] = useState<DashboardView>('tasks');
  const [leftRatio, setLeftRatio] = useState(0.55);
  const [ptyId, setPtyId] = useState<string | null>(null);
  const taskState = useTauriEvents();
  const bodyRef = useRef<HTMLDivElement>(null);

  const startDividerDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const body = bodyRef.current;
    if (body === null) return;
    const bodyRect = body.getBoundingClientRect();
    const sidebarWidth = 160;

    const onMove = (ev: MouseEvent) => {
      const usable = bodyRect.width - sidebarWidth;
      const x = ev.clientX - bodyRect.left - sidebarWidth;
      const ratio = Math.max(MIN_LEFT_RATIO, Math.min(MAX_LEFT_RATIO, x / usable));
      setLeftRatio(ratio);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const hasPending = taskState.pendingApproval !== null;

  // Auto-navigate to approval tab when a gate fires
  useEffect(() => {
    if (taskState.pendingApproval !== null) {
      setView('approval');
    }
  }, [taskState.pendingApproval]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.bg }}>
      <Titlebar />

      <div ref={bodyRef} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav
          style={{
            width: 160,
            flexShrink: 0,
            background: colors.bgCard,
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0',
          }}
        >
          {NAV_ITEMS.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => { setView(id); }}
              style={{
                background: view === id ? colors.bgHover : 'none',
                border: 'none',
                color: view === id ? colors.text : colors.textMuted,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
                position: 'relative',
              }}
            >
              <span>{icon}</span>
              {label}
              {id === 'approval' && hasPending && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: colors.yellow,
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}

          {ptyId !== null && (
            <div
              style={{
                marginTop: 'auto',
                padding: '8px 16px',
                fontSize: 11,
                color: colors.textMuted,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              PTY <code style={{ fontSize: 10 }}>{ptyId.slice(0, 8)}</code>
            </div>
          )}
        </nav>

        {/* Resizable panes */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: leftRatio, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <DashboardPane view={view} onViewChange={setView} taskState={taskState} />
          </div>

          {/* Drag divider */}
          <div
            onMouseDown={startDividerDrag}
            style={{
              width: 4,
              flexShrink: 0,
              background: colors.border,
              cursor: 'col-resize',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = colors.blue; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = colors.border; }}
          />

          <div style={{ flex: 1 - leftRatio, overflow: 'hidden' }}>
            <TerminalPane onReady={setPtyId} />
          </div>
        </div>
      </div>

      <StatusBar taskState={taskState} />
    </div>
  );
}
