# AgentOS Architecture

## Overview

AgentOS is a Turborepo monorepo. The orchestration engine lives in `@agentos/core` (pure
TypeScript, zero UI deps). All three interfaces — CLI/TUI, web dashboard, desktop app — consume
the core package. No interface logic leaks into core.

```text
┌──────────────────────────────────────────────────────────────────┐
│                        Interfaces                                │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  CLI / TUI   │  │  Web dashboard   │  │  Desktop (Tauri)  │  │
│  │  apps/cli    │  │  packages/web    │  │  packages/desktop │  │
│  │  packages/tui│  │  Next.js 15      │  │  Vite + React     │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬──────────┘  │
└─────────┼───────────────────┼─────────────────────┼────────────┘
          │                   │                     │
          └───────────────────┼─────────────────────┘
                              │ imports
          ┌───────────────────▼──────────────────────┐
          │              @agentos/core               │
          │                                          │
          │  WorkflowEngine  ──►  Orchestrator       │
          │       │                    │             │
          │       ▼                    ▼             │
          │  StateManager         AgentSpawner       │
          │  (SQLite/Supabase)    (Anthropic SDK)    │
          │       │                    │             │
          │       ▼                    ▼             │
          │  Tracer               PRDParser          │
          │                       RepoAnalyzer       │
          └──────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  State Storage    │
                    │  SQLite (local)   │
                    │  Supabase (cloud) │
                    └───────────────────┘
```

---

## Core Engine (`packages/core`)

### WorkflowEngine

The central coordinator. Extends `EventEmitter` and exposes a single `run(nodes, opts?)` method.

**Phases** (in order):

| Phase | Agent | Human gate |
| ----- | ----- | ---------- |
| analyze | orchestrator | no |
| plan | planner | **yes** — blocks until `.approve()` or `.reject()` |
| implement | developer | no |
| test | tester | no |
| review | reviewer | no |

**Events emitted** (all typed as `WorkflowEvent` discriminated union):

```typescript
phase_started       { taskId, phase }
phase_completed     { taskId, phase }
phase_failed        { taskId, phase, error }
human_approval_required { taskId, phase, summary }
human_approved      { taskId, phase }
human_rejected      { taskId, phase, reason }
agent_spawned       { taskId, phase, role }
token_usage         { taskId, phase, role, inputTokens, outputTokens, cost }
task_completed      { taskId, totalCost }
task_failed         { taskId, error }
```

**Approval gate pattern:**

```typescript
const engine = new WorkflowEngine({ apiKey, context });

engine.on('event', (e) => {
  if (e.type === 'human_approval_required') {
    // TUI: wait for y/n keypress
    // Web: render approve/reject buttons
    // Desktop: show DashboardPane approval tab
    engine.approve(e.taskId);      // or engine.reject(e.taskId, reason)
  }
});

const taskId = await engine.run(nodes, { resumeFrom: 'implement' });
```

### StateManager

Auto-detects storage backend from environment:

- `SUPABASE_URL` + `SUPABASE_ANON_KEY` set → Supabase adapter
- Otherwise → SQLite adapter (`better-sqlite3` at `AGENTOS_STATE_DIR/agentos.db`)

Both adapters satisfy `StateAdapter`:

```typescript
interface StateAdapter {
  saveCheckpoint(cp: PhaseCheckpoint): Promise<void>;
  loadCheckpoint(taskId: string, phase: WorkflowPhase): Promise<PhaseCheckpoint | null>;
  listCheckpoints(taskId: string): Promise<PhaseCheckpoint[]>;
  deleteCheckpoints(taskId: string): Promise<void>;
  listTaskIds(): Promise<string[]>;
}
```

### AgentSpawner

Wraps `@anthropic-ai/sdk`. Each call:

1. Reads model + thinking budget from `MODEL_REGISTRY[role]`
2. Builds the messages array with codebase context (`CLAUDE.md` + `AGENTS.md` section)
3. Calls `client.messages.create({ model, thinking, stream: true })`
4. Accumulates streaming output, extracts `FileArtifact[]` from ` ```file:path ` fences
5. Returns typed `AgentOutput`

### Tracer

Records a `TraceEntry` per agent invocation. Computes cost via `calculateCost(role, inputTokens, outputTokens)` from `MODEL_REGISTRY`. Accessible via `tracer.getSummary(taskId)`.

---

## Interface Layer

### CLI / TUI (`apps/cli` + `packages/tui`)

```
agentos run "task"
    │
    ├── RepoAnalyzer.analyze()   → CodebaseContext
    ├── PRDParser.parsePrompt()  → TaskNode[]
    ├── new WorkflowEngine(...)
    └── runTui(engine, nodes)    → renders Ink layout
                                    subscribes to engine events
                                    handles y/n/l/q/p keys
```

The TUI uses a pure `tuiReducer(state, action)` over `WorkflowEvent` — no side effects in state.

### Web Dashboard (`packages/web`)

The Next.js app runs a `WorkflowEngine` **in-process** inside the Next.js server. Task state lives
in `global.__agentosRunners` (survives hot-reload). SSE streams events to the browser:

```
Browser             Next.js server          WorkflowEngine
   │                      │                      │
   │ POST /api/tasks       │                      │
   │──────────────────────►│  startTask(prompt)   │
   │                       │─────────────────────►│
   │◄── { taskId }         │◄── taskId (sync)     │
   │                       │                      │
   │ GET /api/tasks/:id/stream (SSE)               │
   │──────────────────────►│                      │
   │◄── event: ...         │◄── engine.on('event')│
   │◄── event: ...         │                      │
```

### Desktop App (`packages/desktop`)

Tauri v2 architecture:

```
React frontend (Vite)          Rust backend (Tauri)
        │                              │
        │ invoke('spawn_terminal')     │
        │─────────────────────────────►│
        │◄── ptyId                     │
        │                              │  portable-pty
        │                              │  ┌──────────┐
        │                              │  │ /bin/zsh │
        │                              │  └──────────┘
        │ listen('pty:ID:data')        │
        │◄─────────────────────────────│ (reader thread)
        │                              │
        │ invoke('list_tasks')         │
        │─────────────────────────────►│  rusqlite → agentos.db
        │◄── TaskSummary[]             │
```

The terminal pane uses xterm.js connected to a native pty (not a web socket). The dashboard pane
reads tasks directly from the SQLite database the CLI writes.

---

## Data Flow: End-to-End

```
User prompt
    │
    ▼
PRDParser.parsePrompt(prompt)
    │  returns TaskNode[] DAG
    ▼
WorkflowEngine.run(nodes)
    │
    ├─► [analyze]   orchestrator reads codebase, plans execution
    │       └─ checkpoint saved
    │
    ├─► [plan]      planner writes implementation plan
    │       └─ human_approval_required emitted → BLOCKS
    │                   user approves via TUI / Web / Desktop
    │       └─ checkpoint saved
    │
    ├─► [implement] developer writes code (FileArtifact[] emitted)
    │       └─ checkpoint saved
    │
    ├─► [test]      tester writes + runs Vitest tests
    │       └─ checkpoint saved
    │
    └─► [review]    reviewer validates quality
            └─ checkpoint saved
            └─ task_completed emitted
```

If any phase fails, rerun with `{ resumeFrom: <last-checkpoint-phase> }` — no full restart.

---

## Key Design Decisions

**Why EventEmitter composition instead of inheritance?**
`WorkflowEngine` wraps an `EventEmitter` rather than extending it so it can be replaced with any
observable in the future (RxJS, custom) without breaking the public API.

**Why SQLite default instead of Supabase?**
Zero-config local dev. Drop in your API key and run — no cloud account required. Supabase is opt-in
for teams who want shared state or persistence beyond a single machine.

**Why in-process engine in the Next.js server?**
Avoids a separate worker process for the web dashboard, simplifying deployment to a single Vercel
function. The global runner map is a known trade-off for dev ergonomics; production deployments
should use a proper job queue (BullMQ, etc.) in a future version.

**Why Tauri instead of Electron?**
~4 MB binary vs ~100 MB+. Native webview (no bundled Chromium). Rust backend for safe pty
management. Auto-updater built in.
