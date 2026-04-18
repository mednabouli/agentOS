import { describe, it, expect } from 'vitest';
import { DESKTOP_VERSION } from '../index.js';

describe('Desktop stub', () => {
  it('exports version string', () => {
    expect(DESKTOP_VERSION).toContain('stub');
  });
});
