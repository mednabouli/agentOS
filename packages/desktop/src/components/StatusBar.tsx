import type { TauriEventState } from '../hooks/useTauriEvents';
import { colors } from '../lib/theme';

const PHASE_COLOR: Record<string, string> = {
  analyze: colors.blue,
  plan: colors.yellow,
  implement: colors.purple,
  test: colors.green,
  review: colors.textMuted,
};

interface StatusBarProps {
  taskState: TauriEventState;
}

export function StatusBar({ taskState }: StatusBarProps) {
  const { activeTaskId, currentPhase, totalCost, pendingApproval } = taskState;
  const phaseColor = currentPhase !== null ? (PHASE_COLOR[currentPhase] ?? colors.textMuted) : colors.textMuted;

  return (
    <div
      style={{
        height: 26,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 16,
        flexShrink: 0,
        fontSize: 11,
        color: colors.textMuted,
      }}
    >
      {activeTaskId !== null && (
        <span>
          Task <code style={{ color: colors.text }}>{activeTaskId.slice(0, 10)}…</code>
        </span>
      )}

      {currentPhase !== null && (
        <span style={{ color: phaseColor }}>
          ⚡ {currentPhase}
        </span>
      )}

      {pendingApproval !== null && (
        <span style={{ color: colors.yellow }}>
          ⚠ Waiting for approval — {pendingApproval.phase}
        </span>
      )}

      <span style={{ marginLeft: 'auto' }}>
        {totalCost > 0 && `$${totalCost.toFixed(4)}`}
      </span>
    </div>
  );
}
