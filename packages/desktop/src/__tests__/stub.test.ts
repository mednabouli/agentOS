import { describe, it, expect } from 'vitest';
import { DESKTOP_VERSION } from '../index.js';

describe('Desktop version', () => {
  it('exports 2.0.0', () => {
    expect(DESKTOP_VERSION).toBe('2.0.0');
  });
});
