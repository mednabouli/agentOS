import { useRef, useEffect } from 'react';
import { useXterm } from '../hooks/useXterm';
import { colors } from '../lib/theme';

interface TerminalPaneProps {
  onReady?: (ptyId: string) => void;
}

export function TerminalPane({ onReady }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { focus } = useXterm(containerRef, { onReady });

  useEffect(() => {
    focus();
  }, [focus]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.bg,
      }}
    >
      <div
        style={{
          padding: '6px 12px',
          background: colors.bgCard,
          borderBottom: `1px solid ${colors.border}`,
          fontSize: 11,
          color: colors.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ color: colors.green }}>●</span> Terminal
      </div>
      <div
        ref={containerRef}
        style={{ flex: 1, padding: 4, overflow: 'hidden' }}
        onClick={focus}
      />
    </div>
  );
}
