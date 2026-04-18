import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../lib/config.js';
import { saveActiveTask, loadActiveTask } from '../lib/active-task.js';
import { MODEL_REGISTRY } from '@agentos/core';

const TEST_DIR = join(tmpdir(), `agentos-cli-test-${process.pid}`);

// ── loadConfig ───────────────────────────────────────────────────────────────

describe('loadConfig', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.agentOS'), { recursive: true });
    delete process.env['ANTHROPIC_API_KEY'];
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env['ANTHROPIC_API_KEY'];
  });

  it('reads API key from env var', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-env-123';
    const cfg = loadConfig(TEST_DIR);
    expect(cfg.apiKey).toBe('sk-env-123');
  });

  it('reads API key from config.yaml', () => {
    writeFileSync(join(TEST_DIR, '.agentOS', 'config.yaml'), 'apiKey: sk-yaml-456\n');
    const cfg = loadConfig(TEST_DIR);
    expect(cfg.apiKey).toBe('sk-yaml-456');
  });

  it('prefers env var over config.yaml', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-env-wins';
    writeFileSync(join(TEST_DIR, '.agentOS', 'config.yaml'), 'apiKey: sk-yaml-loses\n');
    const cfg = loadConfig(TEST_DIR);
    expect(cfg.apiKey).toBe('sk-env-wins');
  });

  it('returns undefined when neither is set', () => {
    const cfg = loadConfig(TEST_DIR);
    expect(cfg.apiKey).toBeUndefined();
  });

  it('ignores commented-out apiKey lines', () => {
    writeFileSync(join(TEST_DIR, '.agentOS', 'config.yaml'), '# apiKey: sk-commented\n');
    const cfg = loadConfig(TEST_DIR);
    expect(cfg.apiKey).toBeUndefined();
  });

  it('sets stateDir relative to rootDir', () => {
    const cfg = loadConfig(TEST_DIR);
    expect(cfg.stateDir).toBe(join(TEST_DIR, '.agentOS', 'state'));
  });
});

// ── active-task persistence ──────────────────────────────────────────────────

describe('active-task', () => {
  const stateDir = join(TEST_DIR, 'state');

  beforeEach(() => mkdirSync(stateDir, { recursive: true }));
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('saves and loads a task', () => {
    const task = {
      taskId: 'abc-123',
      startedAt: '2026-04-18T00:00:00.000Z',
      prompt: 'add auth',
      nodes: [],
    };
    saveActiveTask(stateDir, task);
    const loaded = loadActiveTask(stateDir);
    expect(loaded?.taskId).toBe('abc-123');
    expect(loaded?.prompt).toBe('add auth');
    expect(loaded?.nodes).toEqual([]);
  });

  it('returns null when no file exists', () => {
    expect(loadActiveTask(stateDir)).toBeNull();
  });

  it('overwrites previous task on re-save', () => {
    saveActiveTask(stateDir, { taskId: 'old', startedAt: '', prompt: '', nodes: [] });
    saveActiveTask(stateDir, { taskId: 'new', startedAt: '', prompt: '', nodes: [] });
    expect(loadActiveTask(stateDir)?.taskId).toBe('new');
  });
});

// ── MODEL_REGISTRY completeness ──────────────────────────────────────────────

describe('MODEL_REGISTRY', () => {
  const EXPECTED_ROLES = ['orchestrator', 'planner', 'developer', 'tester', 'reviewer', 'debugger'];

  it('contains all 6 roles', () => {
    for (const role of EXPECTED_ROLES) {
      expect(MODEL_REGISTRY).toHaveProperty(role);
    }
  });

  it('each role has a model, thinkingBudget, and cost rates', () => {
    for (const [role, cfg] of Object.entries(MODEL_REGISTRY)) {
      expect(typeof cfg.model).toBe('string');
      expect(typeof cfg.thinkingBudget).toBe('number');
      expect(typeof cfg.inputCostPerMillion).toBe('number');
      expect(typeof cfg.outputCostPerMillion).toBe('number');
    }
  });

  it('orchestrator has the highest thinking budget', () => {
    const budgets = Object.values(MODEL_REGISTRY).map((c) => c.thinkingBudget);
    const max = Math.max(...budgets);
    expect(MODEL_REGISTRY.orchestrator.thinkingBudget).toBe(max);
  });
});
