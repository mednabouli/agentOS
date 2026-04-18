import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BUILT_IN_TEMPLATES } from '../templates/built-in.js';
import { TemplateRegistry } from '../templates/registry.js';
import { resolveTemplate, validateVars } from '../templates/resolver.js';
import type { AgentTemplate } from '../templates/types.js';

const TEST_DIR = join(tmpdir(), `agentos-templates-test-${process.pid}`);

// ── BUILT_IN_TEMPLATES ───────────────────────────────────────────────────────

describe('BUILT_IN_TEMPLATES', () => {
  it('contains at least 5 templates', () => {
    expect(BUILT_IN_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it('all templates have required fields', () => {
    for (const t of BUILT_IN_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(t.author).toBeTruthy();
      expect(Array.isArray(t.tags)).toBe(true);
      expect(Array.isArray(t.nodes)).toBe(true);
      expect(t.nodes.length).toBeGreaterThan(0);
    }
  });

  it('all template nodes cover analyze → review phases', () => {
    const ALL_PHASES = ['analyze', 'plan', 'implement', 'test', 'review'];
    for (const t of BUILT_IN_TEMPLATES) {
      const phases = new Set(t.nodes.map((n) => n.phase));
      for (const p of ALL_PHASES) {
        expect(phases.has(p as never), `${t.id} missing phase: ${p}`).toBe(true);
      }
    }
  });

  it('includes add-payments, add-auth, rest-api, react-component, bug-fix', () => {
    const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('add-payments');
    expect(ids).toContain('add-auth');
    expect(ids).toContain('rest-api');
    expect(ids).toContain('react-component');
    expect(ids).toContain('bug-fix');
  });
});

// ── validateVars ─────────────────────────────────────────────────────────────

describe('validateVars', () => {
  const template = BUILT_IN_TEMPLATES.find((t) => t.id === 'add-payments')!;

  it('returns empty array when all required vars supplied', () => {
    const missing = validateVars(template, {
      PAYMENT_PROVIDER: 'Stripe',
      FEATURE: 'checkout',
    });
    expect(missing).toEqual([]);
  });

  it('returns missing required var names', () => {
    const missing = validateVars(template, { PAYMENT_PROVIDER: 'Stripe' });
    expect(missing).toContain('FEATURE');
  });

  it('does not flag optional vars as missing', () => {
    const missing = validateVars(template, {
      PAYMENT_PROVIDER: 'Stripe',
      FEATURE: 'checkout',
    });
    expect(missing).not.toContain('CURRENCY');
  });
});

// ── resolveTemplate ──────────────────────────────────────────────────────────

describe('resolveTemplate', () => {
  const template = BUILT_IN_TEMPLATES.find((t) => t.id === 'add-payments')!;

  it('substitutes all supplied variables into node prompts', () => {
    const nodes = resolveTemplate(template, {
      PAYMENT_PROVIDER: 'Paddle',
      FEATURE: 'subscriptions',
      CURRENCY: 'EUR',
    });
    const allPrompts = nodes.map((n) => n.input.prompt).join(' ');
    expect(allPrompts).toContain('Paddle');
    expect(allPrompts).toContain('subscriptions');
    expect(allPrompts).toContain('EUR');
  });

  it('uses default value when optional var is not supplied', () => {
    const nodes = resolveTemplate(template, {
      PAYMENT_PROVIDER: 'Stripe',
      FEATURE: 'checkout',
    });
    const allPrompts = nodes.map((n) => n.input.prompt).join(' ');
    expect(allPrompts).toContain('USD');
  });

  it('does not mutate the original template nodes', () => {
    const originalPrompt = template.nodes[0]?.input.prompt ?? '';
    resolveTemplate(template, { PAYMENT_PROVIDER: 'X', FEATURE: 'Y', CURRENCY: 'Z' });
    expect(template.nodes[0]?.input.prompt).toBe(originalPrompt);
  });

  it('leaves unresolved placeholders intact when var is missing', () => {
    const nodes = resolveTemplate(template, { PAYMENT_PROVIDER: 'Stripe' });
    const allPrompts = nodes.map((n) => n.input.prompt).join(' ');
    expect(allPrompts).toContain('{{FEATURE}}');
  });
});

// ── TemplateRegistry ─────────────────────────────────────────────────────────

describe('TemplateRegistry', () => {
  beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }));
  afterEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('lists all built-in templates', () => {
    const registry = new TemplateRegistry(TEST_DIR);
    const list = registry.list();
    expect(list.length).toBeGreaterThanOrEqual(BUILT_IN_TEMPLATES.length);
  });

  it('get returns null for unknown id', () => {
    const registry = new TemplateRegistry(TEST_DIR);
    expect(registry.get('nonexistent-id')).toBeNull();
  });

  it('get returns built-in template by id', () => {
    const registry = new TemplateRegistry(TEST_DIR);
    const t = registry.get('add-payments');
    expect(t).not.toBeNull();
    expect(t?.name).toBeTruthy();
  });

  it('search finds templates by tag', () => {
    const registry = new TemplateRegistry(TEST_DIR);
    const results = registry.search('payments');
    expect(results.some((t) => t.id === 'add-payments')).toBe(true);
  });

  it('search finds templates by description keyword', () => {
    const registry = new TemplateRegistry(TEST_DIR);
    const results = registry.search('authentication');
    expect(results.some((t) => t.id === 'add-auth')).toBe(true);
  });

  it('installFromFile persists and retrieves custom template', () => {
    const custom: AgentTemplate = {
      id: 'my-custom',
      name: 'My Custom Template',
      description: 'Test',
      version: '1.0.0',
      author: 'Test',
      tags: ['custom'],
      variables: [],
      nodes: [],
    };
    const filePath = join(TEST_DIR, 'custom.json');
    writeFileSync(filePath, JSON.stringify(custom), 'utf-8');

    const registry = new TemplateRegistry(TEST_DIR);
    registry.installFromFile(filePath);

    const found = registry.get('my-custom');
    expect(found?.name).toBe('My Custom Template');
  });

  it('uninstall removes installed template', () => {
    const custom: AgentTemplate = {
      id: 'to-remove',
      name: 'Remove Me',
      description: 'Test',
      version: '1.0.0',
      author: 'Test',
      tags: [],
      variables: [],
      nodes: [],
    };
    const registry = new TemplateRegistry(TEST_DIR);
    registry.install(custom);
    expect(registry.get('to-remove')).not.toBeNull();

    const removed = registry.uninstall('to-remove');
    expect(removed).toBe(true);
    expect(registry.get('to-remove')).toBeNull();
  });

  it('installed template overrides built-in with same id', () => {
    const override: AgentTemplate = {
      id: 'add-payments',
      name: 'Custom Payments',
      description: 'Override',
      version: '9.0.0',
      author: 'Custom',
      tags: [],
      variables: [],
      nodes: [],
    };
    const registry = new TemplateRegistry(TEST_DIR);
    registry.install(override);

    const t = registry.get('add-payments');
    expect(t?.name).toBe('Custom Payments');
    expect(t?.version).toBe('9.0.0');
  });
});
