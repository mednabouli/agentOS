import { describe, it, expect } from 'vitest';
import { TUI_VERSION } from '../index.js';

describe('TUI stub', () => {
  it('exports version string', () => {
    expect(TUI_VERSION).toContain('stub');
  });
});
