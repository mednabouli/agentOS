import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RepoAnalyzer } from '../analyzer/index.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TEST_ROOT = '/tmp/agentos-test-repo';

beforeAll(() => {
  mkdirSync(join(TEST_ROOT, 'src/app'), { recursive: true });
  mkdirSync(join(TEST_ROOT, 'src/components'), { recursive: true });
  writeFileSync(
    join(TEST_ROOT, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      dependencies: { next: '15.0.0', '@supabase/supabase-js': '2.0.0' },
      devDependencies: { typescript: '5.0.0', vitest: '3.0.0' },
    }),
    'utf-8',
  );
  writeFileSync(join(TEST_ROOT, 'src/app/page.tsx'), 'export default function Page() {}', 'utf-8');
});

afterAll(() => {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});

describe('RepoAnalyzer', () => {
  it('detects Next.js and Supabase in stack', () => {
    const analyzer = new RepoAnalyzer(TEST_ROOT);
    const ctx = analyzer.analyze();
    expect(ctx.stack).toContain('Next.js');
    expect(ctx.stack).toContain('Supabase');
    expect(ctx.stack).toContain('TypeScript');
  });

  it('detects App Router pattern', () => {
    const analyzer = new RepoAnalyzer(TEST_ROOT);
    const ctx = analyzer.analyze();
    expect(ctx.patterns['routing']).toContain('App Router');
  });

  it('sets rootDir correctly', () => {
    const analyzer = new RepoAnalyzer(TEST_ROOT);
    const ctx = analyzer.analyze();
    expect(ctx.rootDir).toBe(TEST_ROOT);
  });

  it('generates CLAUDE.md content', () => {
    const analyzer = new RepoAnalyzer(TEST_ROOT);
    const ctx = analyzer.analyze();
    expect(ctx.claudeMd).toBeDefined();
    expect(ctx.claudeMd).toContain('CLAUDE.md');
    expect(ctx.claudeMd).toContain('Next.js');
  });

  it('builds a non-empty folder structure', () => {
    const analyzer = new RepoAnalyzer(TEST_ROOT);
    const ctx = analyzer.analyze();
    expect(ctx.folderStructure.length).toBeGreaterThan(0);
    expect(ctx.folderStructure).toContain('src');
  });
});
