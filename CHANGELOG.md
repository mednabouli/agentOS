# Changelog

All notable changes to AgentOS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
AgentOS uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] — 2026-04-18

### Added

- **Tauri v2 desktop app** (`@agentos/desktop`) — native Mac/Windows/Linux binary
- Two-pane layout: resizable dashboard left pane + embedded xterm.js terminal right pane
- Custom frameless titlebar with minimize/maximize/close (macOS traffic-light style)
- `DashboardPane` with Tasks, New Swarm, and Approval Gate sub-tabs
- `TerminalPane` — xterm.js connected to a native pty via Rust `portable-pty`
- `StatusBar` showing active task ID, current phase, and total cost
- Rust backend commands: `spawn_terminal`, `write_pty`, `resize_pty`, `kill_pty`, `list_tasks`, `get_config`, `save_config`
- Tauri capabilities: window drag, minimize, maximize, close
- GitHub Actions release workflow: builds Tauri binaries for macOS arm64/x86, Linux, Windows on tag push
- `prd-samples/` — three ready-to-run PRD examples: Stripe payments, auth system, REST API

---

## [1.5.0] — 2026-04-17

### Added

- **Next.js 15 web dashboard** (`@agentos/web`) — full App Router implementation
- Pages: `/dashboard`, `/swarms/new`, `/swarms/[id]`, `/agents`, `/costs`, `/prd`, `/team`, `/settings`
- Real-time SSE streaming via `/api/tasks/[id]/stream` with event replay buffer
- Human approval gate UI (approve/reject buttons) in swarm detail page
- Phase timeline with live status badges (idle → running → completed/failed)
- Cost breakdown table with per-phase and per-task totals
- PRD parser page with section detection, word count, and character stats
- Global `__agentosRunners` map surviving Next.js hot-reload
- `StateAdapter.listTaskIds()` added to core for dashboard task enumeration

---

## [1.0.0] — 2026-04-17

### Added

- **CLI** (`apps/cli/`) — public `npx agentos` entry point
- 8 commands: `init`, `run`, `status`, `logs`, `cost`, `agents list`, `pause`, `resume`
- `--prd` flag on `run` to parse a PRD markdown file into a task DAG
- `ActiveTask` JSON persisted to `.agentOS/state/active-task.json` for resume support
- `agentos resume` computes `resumeFrom` from last checkpoint and re-enters the TUI

---

## [0.2.0] — 2026-04-17

### Added

- **Ink TUI** (`@agentos/tui`) — 4-pane terminal UI built on Ink v5 + React 18
- `OrchestratorPane` — mission status and subtask count
- `AgentSwarmPane` — per-agent status with icons (✅ / ⚡ / ⏳ / ✗)
- `TokenBudgetPane` — live token usage bars per role + total cost
- `LiveLogsPane` — scrollable event log (toggle with `l`)
- `PhaseGatePane` — approval gate with `y`/`n` keyboard shortcuts
- `runTui(engine, nodes, opts?)` — main entry point; renders layout, handles `y`/`n`/`l`/`q`/`p`
- Pure `tuiReducer` over `WorkflowEvent` discriminated union for predictable state

---

## [0.1.0] — 2026-04-17

### Added

- **`@agentos/core`** — fully implemented orchestration engine
- `WorkflowEngine` — phase-gated execution (analyze → plan → implement → test → review), EventEmitter composition, human approval gates
- `Orchestrator` — builds `TaskNode[]` DAG, dispatches agents in dependency order
- `AgentSpawner` — Anthropic SDK with extended thinking, streaming responses
- `StateManager` — auto-detects SQLite vs Supabase from env; unified `StateAdapter` interface
- `Tracer` — records token usage, latency, and cost per agent per task
- `RepoAnalyzer` — detects project stack, writes `CLAUDE.md` codebase context
- `PRDParser` — converts markdown PRD into `TaskNode[]` DAG with dependency edges
- `MODEL_REGISTRY` — role → model + thinking budget + $/1M token rates
- `WorkflowEvent` discriminated union (14 event types)
- Supabase migrations: 7 tables + RLS policies
- `CLAUDE.md` and `AGENTS.md` — injected into every spawned agent at boot
- 55 Vitest tests across all 10 core modules
