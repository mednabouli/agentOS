import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { xtermTheme } from '../lib/theme';
import { spawnTerminal, writePty, resizePty, killPty, onPtyData } from '../lib/bridge';
import type { UnlistenFn } from '@tauri-apps/api/event';

export interface UseXtermOptions {
  onReady?: ((id: string) => void) | undefined;
}

export function useXterm(
  containerRef: React.RefObject<HTMLDivElement | null>,
  opts?: UseXtermOptions,
) {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const term = new Terminal({
      theme: xtermTheme,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(container);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    spawnTerminal(term.cols, term.rows)
      .then(async (id) => {
        ptyIdRef.current = id;
        opts?.onReady?.(id);

        unlistenRef.current = await onPtyData(id, (data) => {
          term.write(data);
        });

        term.onData((data) => { void writePty(id, data); });
        term.onResize(({ cols, rows }) => { void resizePty(id, cols, rows); });
      })
      .catch((err: unknown) => {
        term.write(`\r\n\x1b[31mFailed to spawn terminal: ${String(err)}\x1b[0m\r\n`);
      });

    const ro = new ResizeObserver(() => { fitAddon.fit(); });
    ro.observe(container);

    return () => {
      unlistenRef.current?.();
      ro.disconnect();
      const id = ptyIdRef.current;
      if (id !== null) void killPty(id);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      ptyIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focus = useCallback(() => { termRef.current?.focus(); }, []);
  const write = useCallback((data: string) => { termRef.current?.write(data); }, []);

  return { focus, write };
}
