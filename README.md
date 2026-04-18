# AgentOS

**Multi-interface AI agent orchestration platform built natively for Claude.**

[![CI](https://github.com/med-nabouli/agentOS/actions/workflows/ci.yml/badge.svg)](https://github.com/med-nabouli/agentOS/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/agentos.svg)](https://www.npmjs.com/package/agentos)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen)](https://nodejs.org)

> Drop in your Claude API key. Run one command. Watch a swarm of agents build your feature.

---

## What is AgentOS?

AgentOS lets you deploy multi-agent Claude swarms directly from your terminal, browser, or desktop app — with zero configuration friction.

A single task passes through a **phase-gated workflow**: the orchestrator analyzes your codebase, the planner proposes an implementation plan (you approve it), the developer writes the code, the tester writes tests, and the reviewer validates quality. Every phase writes a checkpoint — if anything fails, resume from where you left off.

```text
[analyze] → [plan + YOU APPROVE] → [implement] → [test] → [review]
```

---

## Interfaces

| Interface | Status | Install |
| --------- | ------ | ------- |
| CLI / TUI | ✅ v1.0 | `npx agentos` |
| Web dashboard | ✅ v1.5 | `pnpm --filter @agentos/web dev` |
| Desktop app (Tauri) | ✅ v2.0 | [GitHub Releases](https://github.com/med-nabouli/agentOS/releases) |

---

## Quick Start

```bash
# Install globally
npm install -g agentos
# or use without installing
npx agentos

# 1. Initialize AgentOS in your project
agentos init

# 2. Run a task (interactive TUI)
agentos run "add Stripe payments to the checkout flow"

# 3. Run from a PRD file
agentos run --prd ./prd-samples/stripe-payments.md

# 4. Check status
agentos status

# 5. View cost breakdown
agentos cost
```

### Requirements

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com)

---

## Installation (from source)

```bash
git clone https://github.com/med-nabouli/agentOS
cd agentOS

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the CLI
node apps/cli/dist/bin/index.js init
```

---

## TUI Layout

```text
┌─ Orchestrator ──────────────────┐ ┌─ Agent Swarm ──────────────────────┐
│ 🧠 Planning task...             │ │ ✅ Planner     → done              │
│ → 4 subtasks generated          │ │ ⚡ Developer   → writing auth.ts   │
│ → Dispatching workers...        │ │ ⏳ Tester      → waiting           │
└─────────────────────────────────┘ │ ⏳ Reviewer    → waiting           │
┌─ Token Budget ──────────────────┐ └────────────────────────────────────┘
│ Orchestrator  12,400 / 63,999   │ ┌─ Live Logs ────────────────────────┐
│ Developer      3,200 / 16,000   │ │ [09:04] Developer: created         │
│ Tester           800 /  4,000   │ │         /src/lib/auth.ts           │
│ Total cost: $0.12               │ │ [09:05] Writing JWT middleware...  │
└─────────────────────────────────┘ └────────────────────────────────────┘
┌─ Phase Gate ────────────────────────────────────────────────────────────┐
│ ⚠️  APPROVE PLAN before implementation begins                           │
│  Plan: Create auth.ts, middleware.ts, update supabase schema            │
│  [y] Approve   [n] Reject   [l] Toggle logs   [q] Quit                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Hierarchy

| Role | Model | Thinking Budget | Phase |
| ---- | ----- | --------------- | ----- |
| Orchestrator | claude-opus-4-5 | 63,999 tokens | analyze |
| Planner | claude-sonnet-4-5 | 16,000 tokens | plan |
| Developer | claude-sonnet-4-5 | 16,000 tokens | implement |
| Tester | claude-haiku-4-5 | 4,000 tokens | test |
| Reviewer | claude-haiku-4-5 | 0 | review |
| Debugger | claude-sonnet-4-5 | 32,000 tokens | any |

---

## CLI Commands

```bash
agentos init                        # scaffold AGENTS.md + config
agentos run "add Stripe payments"   # launch swarm (interactive TUI)
agentos run --prd ./prd.md          # run from PRD file
agentos status                      # show active swarm status
agentos logs [task-id]              # view agent logs
agentos cost [task-id]              # token + dollar cost breakdown
agentos agents list                 # show available agent roles
agentos pause                       # pause active swarm
agentos resume                      # resume from last checkpoint
```

---

## Web Dashboard

```bash
# Start the Next.js dashboard
pnpm --filter @agentos/web dev
# Open http://localhost:3000
```

Pages: Dashboard · New Swarm · Live Swarm View · PRD Parser · Agents · Costs · Team · Settings

---

## Configuration

AgentOS stores its config in `.agentOS/config.yaml` (gitignored):

```yaml
anthropicApiKey: sk-ant-...
logLevel: info
autoApprove: false     # set true to skip the plan approval gate
stateDir: .agentOS/state
```

Or use environment variables:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export SUPABASE_URL=https://xxxx.supabase.co       # optional — cloud state
export SUPABASE_ANON_KEY=eyJ...                     # optional
```

Without Supabase env vars, AgentOS uses a local SQLite database at `.agentOS/state/agentos.db`.

---

## Monorepo Structure

```text
packages/
  core/       — Orchestration engine (pure TypeScript, zero UI deps)
  tui/        — Ink terminal UI (React + xterm.js)
  web/        — Next.js 15 dashboard
  desktop/    — Tauri v2 desktop app
apps/
  cli/        — npx agentos entry point
supabase/
  migrations/ — PostgreSQL schema + RLS policies
prd-samples/  — Example PRD files for demos
```

---

## Development

```bash
# Run all tests
pnpm --filter @agentos/core test
pnpm --filter @agentos/tui test
pnpm --filter agentos test
pnpm --filter @agentos/web test
pnpm --filter @agentos/desktop test

# Typecheck everything
pnpm --filter @agentos/core typecheck
pnpm --filter @agentos/web typecheck
pnpm --filter @agentos/desktop typecheck

# Build core
pnpm --filter @agentos/core build
```

---

## Contributing

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes, ensure `pnpm test` passes for affected packages
3. Run `pnpm typecheck` (zero errors required)
4. Submit a PR with a clear description of what changed and why

See [CLAUDE.md](CLAUDE.md) for codebase conventions and [AGENTS.md](AGENTS.md) for agent role contracts.

---

## Roadmap

- [x] v0.1 — `@agentos/core` engine
- [x] v0.2 — Ink TUI
- [x] v1.0 — CLI public launch
- [x] v1.5 — Next.js web dashboard
- [x] v2.0 — Tauri desktop app
- [x] v2.1 — In-process task runner sidecar for desktop approve/reject
- [x] v3.0 — Custom model routing (Bedrock, Azure OpenAI)
- [x] v3.1 — Agent marketplace + template library

---

## License

MIT — see [LICENSE](LICENSE)
