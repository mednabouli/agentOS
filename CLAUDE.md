# CLAUDE.md — AgentOS Codebase Context

This file is injected at boot into every agent spawned by AgentOS.
Keep it accurate. `RepoAnalyzer` can regenerate it via `agentos init`.

---

## Project

**AgentOS** — multi-interface AI agent orchestration platform built natively for Claude.

## Stack

- Runtime: Node.js 20+, TypeScript 5.8 (strict mode, `noUncheckedIndexedAccess`)
- Monorepo: Turborepo + pnpm workspaces
- Core engine: `@agentos/core` — pure TypeScript, no UI deps
- TUI: Ink + React (stub → v0.2)
- Web: Next.js 15 App Router (stub → v1.5)
- Desktop: Tauri v2 (stub → v2.0)
- Database: Supabase (PostgreSQL) for cloud; better-sqlite3 for local
- Testing: Vitest (all packages)
- Schema validation: Zod

## Monorepo Structure

```text
packages/
  core/           — orchestration engine (fully implemented)
    src/
      types/      — shared TypeScript types + WorkflowEvent union
      schemas/    — Zod schemas matching all types
      config/     — model-registry (role→model+budget+cost), phases
      utils/      — id, logger, errors
      spawner/    — AgentSpawner (@anthropic-ai/sdk, extended thinking)
      state/      — StateManager (SQLite + Supabase adapters)
      tracer/     — Tracer (token usage, cost, latency)
      analyzer/   — RepoAnalyzer (stack detection, writes CLAUDE.md)
      prd/        — PRDParser (markdown → TaskNode[] DAG)
      orchestrator/ — Orchestrator (executes DAG, respects dependencies)
      workflow/   — WorkflowEngine (phase-gated, EventEmitter, approval gates)
  tui/            — Ink terminal UI (stub)
  web/            — Next.js dashboard (stub)
  desktop/        — Tauri desktop app (stub)
apps/
  cli/            — npx agentos entry point (stub)
supabase/
  migrations/     — PostgreSQL schema + RLS policies
.agentOS/
  config.yaml     — API key, model prefs (gitignored)
  state/          — local SQLite DB (gitignored)
```

## Agent Hierarchy

| Role | Model | Thinking Budget | Phase |
|------|-------|----------------|-------|
| orchestrator | claude-opus-4-5 | 63,999 | analyze |
| planner | claude-sonnet-4-5 | 16,000 | plan |
| developer | claude-sonnet-4-5 | 16,000 | implement |
| tester | claude-haiku-4-5 | 4,000 | test |
| reviewer | claude-haiku-4-5 | 0 | review |
| debugger | claude-sonnet-4-5 | 32,000 | any |

## Workflow Phases

```text
[1. analyze] → [2. plan + APPROVE] → [3. implement] → [4. test] → [5. review]
```

Phase `plan` always emits `human_approval_required` and blocks until `.approve()` or `.reject()`.

## Key Conventions

- **Imports**: all internal imports use `.js` extension (NodeNext module resolution)
- **Types**: `import type` for type-only imports (`verbatimModuleSyntax`)
- **Arrays**: `arr[i]` returns `T | undefined` — always guard (`noUncheckedIndexedAccess`)
- **Comments**: only when WHY is non-obvious; no docstrings
- **Tests**: Vitest, co-located in `src/__tests__/`, test behavior not internals
- **Errors**: throw typed errors from `utils/errors.ts`, never raw strings
- **File artifacts**: emit using ` ```file:path/to/file ` fence format
- **Handoffs**: end response with `HANDOFF_TO: <role>` + `HANDOFF_PAYLOAD: <json>`
- **Costs**: all cost math goes through `calculateCost()` in `config/model-registry.ts`
