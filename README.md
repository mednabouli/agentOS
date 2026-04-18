# agentOS

Multi-interface AI agent orchestration platform built natively for Claude.

> Drop in your Claude API key. Run one command. Watch a swarm of agents build your feature.

## Quick Start

```bash
# Install
pnpm install -g agentos
# or
npx agentos

# Initialize in your project
agentos init

# Run a task
agentos run "add Stripe payments"

# Run from a PRD file
agentos run --prd ./prd.md
```

## Requirements

- Node 20+
- pnpm 9+
- An [Anthropic API key](https://console.anthropic.com)

## Setup

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

pnpm install
pnpm build
```

## Monorepo Structure

```text
packages/
  core/     — Orchestration engine (pure TypeScript)
  tui/      — Ink terminal UI
  web/      — Next.js dashboard
  desktop/  — Tauri v2 desktop app
apps/
  cli/      — npx agentos entry point
supabase/   — DB schema and migrations
```

## Agent Hierarchy

| Role | Model | Thinking | Responsibility |
|------|-------|----------|----------------|
| Orchestrator | claude-opus-4 | 63,999 | Plans mission, builds task DAG |
| Planner | claude-sonnet-4-5 | 16,000 | Domain planning, subtask breakdown |
| Developer | claude-sonnet-4-5 | 16,000 | Writes code, creates files |
| Tester | claude-haiku-4 | 4,000 | Generates and runs tests |
| Reviewer | claude-haiku-4 | 0 | Pattern checks, lint, formatting |
| Debugger | claude-sonnet-4-5 | 32,000 | Root cause analysis |

## License

MIT
