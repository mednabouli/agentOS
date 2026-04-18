import type { ITheme } from '@xterm/xterm';

export const xtermTheme: ITheme = {
  background: '#0d1117',
  foreground: '#e6edf3',
  cursor: '#58a6ff',
  cursorAccent: '#0d1117',
  selectionBackground: '#264f7866',
  black: '#0d1117',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#e6edf3',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d8c1',
  brightWhite: '#ffffff',
};

export const colors = {
  bg: '#0d1117',
  bgCard: '#161b22',
  bgHover: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  blue: '#58a6ff',
  green: '#3fb950',
  red: '#f85149',
  yellow: '#d29922',
  purple: '#bc8cff',
} as const;
