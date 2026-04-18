# Contributing to AgentOS

Thank you for your interest in contributing. This guide covers everything you need to get started.

---

## Table of Contents

- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Making changes](#making-changes)
- [Testing](#testing)
- [Commit conventions](#commit-conventions)
- [Submitting a PR](#submitting-a-pr)
- [Package versioning](#package-versioning)

---

## Development setup

**Prerequisites:** Node.js 20+, pnpm 10+, Rust stable (only needed for desktop changes)

```bash
git clone https://github.com/med-nabouli/agentOS
cd agentOS
pnpm install

# Build @agentos/core (required by all other packages)
pnpm --filter @agentos/core build

# Verify everything passes
pnpm --filter @agentos/core test
pnpm --filter @agentos/tui test
pnpm --filter agentos test
pnpm --filter @agentos/web test
pnpm --filter @agentos/desktop test
```

Copy `.env.example` to `.env` and add your Anthropic API key to test live agent runs:

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Project structure

```text
packages/core/     — Pure TypeScript engine. No UI deps. Most contributions start here.
packages/tui/      — Ink terminal UI. Depends on core.
packages/web/      — Next.js 15 dashboard. Depends on core.
packages/desktop/  — Tauri v2 + React. Depends on core (via Vite frontend).
apps/cli/          — npx agentos entry point. Depends on core + tui.
supabase/          — PostgreSQL schema and RLS policies.
prd-samples/       — Example PRD files for testing.
docs/              — Architecture and API reference.
```

See [docs/architecture.md](docs/architecture.md) for a full system diagram.

---

## Making changes

### Core engine changes (`packages/core`)

This is the most critical package. Every change needs:

1. A unit test in `src/__tests__/` covering the new behavior
2. Zero new `any` types
3. Typed errors from `src/utils/errors.ts` — never `throw new Error('...')`
4. Internal imports use `.js` extension (`import { foo } from './bar.js'`)

### Adding a new WorkflowEvent type

1. Add the discriminated union member to `src/types/index.ts`
2. Add the matching Zod schema in `src/schemas/index.ts`
3. Emit it in `src/workflow/index.ts`
4. Handle it in the TUI reducer (`packages/tui/src/state.ts`)
5. Handle it in the web SSE client (`packages/web/src/app/swarms/[id]/page.tsx`)
6. Handle it in the desktop hook (`packages/desktop/src/hooks/useTauriEvents.ts`)

### Adding a new CLI command

1. Create `apps/cli/src/commands/<name>.ts`
2. Register it in `apps/cli/src/bin/index.ts`
3. Add a test in `apps/cli/src/__tests__/<name>.test.ts`

### Adding a web dashboard page

1. Create `packages/web/src/app/<route>/page.tsx`
2. Add the nav link in `packages/web/src/components/Sidebar.tsx`
3. Server components use `getDb()` from `src/lib/db.ts` for data fetching
4. Client components use `'use client'` and fetch via the API routes

---

## Testing

Run tests for whichever package you changed:

```bash
# Single package
pnpm --filter @agentos/core test
pnpm --filter @agentos/web test

# With coverage
pnpm --filter @agentos/core test -- --coverage

# Watch mode
pnpm --filter @agentos/core test -- --watch
```

**Rules:**
- Test behavior, not implementation. Don't assert on internal method calls unless the side-effect
  is the only observable outcome.
- Mock at the system boundary: `@anthropic-ai/sdk`, Supabase client, filesystem in integration
  tests. Never mock internal `@agentos/core` modules.
- All new exported functions need at least one test.

---

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

feat(core): add WorkflowEvent for agent_timeout
fix(tui): prevent duplicate phase_started renders
chore(deps): bump @anthropic-ai/sdk to 0.52
docs(api): document StateManager.listTaskIds
test(cli): add resume command integration tests
```

**Types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`

**Scopes:** `core`, `tui`, `web`, `desktop`, `cli`, `deps`, `ci`, `docs`

Breaking changes: append `!` after the type/scope and add `BREAKING CHANGE:` in the footer.

---

## Submitting a PR

1. Fork the repo, create a branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes — one logical change per PR, please
3. Ensure tests pass: `pnpm --filter <package> test`
4. Ensure zero TypeScript errors: `pnpm --filter <package> typecheck`
5. Update `CHANGELOG.md` under `[Unreleased]` if your change is user-visible
6. Push and open a PR — the PR template will guide you through the checklist

CI must pass (typecheck + all tests on ubuntu + macos) before a PR can be merged.

---

## Package versioning

AgentOS follows [Semantic Versioning](https://semver.org/):

| Package | Current | Notes |
| ------- | ------- | ----- |
| `@agentos/core` | 0.1.0 | Pre-1.0; minor = new features, patch = fixes |
| `@agentos/tui` | 0.2.0 | Tracks core minor version |
| `agentos` (CLI) | 1.0.0 | Public API stable |
| `@agentos/web` | 1.5.0 | Internal — not published to npm |
| `@agentos/desktop` | 2.0.0 | Distributed via GitHub Releases |

Versions are bumped manually before tagging a release. The release workflow triggers on
`git tag v<semver>` pushed to `main`.

---

## Questions?

Open a [Discussion](https://github.com/med-nabouli/agentOS/discussions) or file an
[Issue](https://github.com/med-nabouli/agentOS/issues) — we're happy to help.
