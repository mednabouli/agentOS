# Product Requirements Document
# AgentOS — Multi-Interface AI Agent Orchestration Platform for Claude

**Version:** 1.0  
**Date:** April 17, 2026  
**Author:** Med Nabouli  
**Status:** Ready for Development

---

## 1. Executive Summary

AgentOS is an open-source, production-ready AI agent orchestration platform built natively for Claude. It enables any developer to deploy intelligent multi-agent swarms directly from their terminal, web browser, or desktop app — with zero configuration friction. Unlike Ruflo (a CLI-only tool) or generic frameworks like LangChain/CrewAI, AgentOS is Claude-native, multi-interface, and ships with built-in cost observability, PRD-to-code pipelines, and phase-gated workflows.

**Core Value Proposition:**  
> "Drop in your Claude API key. Run one command. Watch a swarm of agents build your feature."

---

## 2. Problem Statement

- Existing agent frameworks (Ruflo, LangChain, CrewAI) require heavy manual configuration
- Ruflo is CLI-only — no visual interface, no cost tracking, no PRD integration
- Multi-agent systems waste tokens through flat shared context windows
- No existing tool offers terminal + web + desktop in one unified product
- Developers have no real-time visibility into agent cost, progress, or failures
- No tool turns a PRD document directly into an executable agent task graph

---

## 3. Target Users

### Primary — Solo Dev / Indie Hacker
- Builds SaaS products alone
- Heavy Claude Code user
- Lives in the terminal (iTerm2, Warp, Ghostty)
- Wants maximum output with minimum API spend

### Secondary — Small Dev Team (2–10)
- Needs shared agent templates and workspaces
- Wants a visual dashboard to monitor agent runs
- Cares about per-task cost attribution

### Tertiary — Dev Agency / Enterprise
- Needs self-hosted deployment
- SSO, RBAC, audit logs
- Custom model routing (Bedrock, Azure OpenAI)

---

## 4. Product Architecture

### 4.1 Monorepo Structure (Turborepo)

```
/agentOS
├── packages/
│   ├── core/           ← Orchestration engine (pure TypeScript)
│   ├── tui/            ← Ink terminal UI
│   ├── web/            ← Next.js dashboard
│   └── desktop/        ← Tauri v2 desktop app
├── apps/
│   └── cli/            ← npx agentOS entry point
├── supabase/           ← DB schema, migrations, RLS policies
├── .agentOS/
│   ├── config.yaml     ← API key, model prefs, team config
│   └── state/          ← Local SQLite or Supabase checkpoints
├── CLAUDE.md           ← Codebase context injected at boot
├── AGENTS.md           ← Progressive context per agent role
├── README.md           ← Project overview, installation, usage
├── LICENSE             ← MIT License
├── .gitignore          ← Ignore node_modules, .agentOS/state, etc.      
├── package.json         ← Monorepo dependencies and scripts
├── turbo.json           ← Turborepo configuration
├── tsconfig.json        ← TypeScript configuration
├── supabase.sql         ← Supabase table definitions and policies
├── prd-samples/         ← Example PRD files for testing and demos
├── docs/                ← Design docs, API specs, architecture diagrams
├── .github/             ← GitHub Actions workflows, issue templates, etc.
├── .vscode/              ← Recommended VSCode extensions, launch configs
├── .editorconfig         ← Code formatting rules
├── .prettierignore        ← Files to ignore for Prettier
├── .eslintrc.json         ← ESLint configuration
├── .stylelintrc.json       ← Stylelint configuration (if needed)
├── .dockerignore           ← Files to ignore for Docker builds (if needed)
├── Dockerfile                ← For containerized deployment (if needed)
├── Docs/                    ← User guides, API documentation, architecture diagrams
├── tests/                   ← Unit and integration tests for core engine and interfaces
├── examples/                ← Example usage scripts, PRD files, and demo scenarios
├── templates/               ← Starter templates for common agent tasks (auth, payments, etc.)
├── .env.example              ← Example environment variable file for local development
├── .env.production           ← Environment variables for production deployment (not committed to Git)
├── .env.test                 ← Environment variables for testing (not committed to Git)
├── .env.local                ← Local environment variables (not committed to Git)
├── .env.development          ← Environment variables for development (not committed to Git)
├── .env.staging              ← Environment variables for staging deployment (not committed to Git)
├── .env.ci                   ← Environment variables for CI/CD pipelines (not committed to Git)
├── .env.docker                ← Environment variables for Docker deployment (not committed to Git)
├── .env.supabase              ← Environment variables for Supabase integration (not committed to Git)
├── .env.vercel                ← Environment variables for Vercel deployment (not committed to Git)
├── .env.tauri                  ← Environment variables for Tauri desktop app (not committed to Git)
├── .env.localhost              ← Environment variables for localhost development (not committed to Git)
├── .env.production.local        ← Environment variables for production on local machine (not committed to Git)
├── .env.staging.local           ← Environment variables for staging on local machine (not committed to Git)
├── .env.test.local             ← Environment variables for testing on local machine (not committed to Git)
├── .env.development.local      ← Environment variables for development on local machine (not committed to Git)
├── .env.ci.local               ← Environment variables for CI/CD on local machine (not committed to Git)
├── .env.docker.local            ← Environment variables for Docker on local machine (not committed to Git)
├── .env.supabase.local          ← Environment variables for Supabase on local machine (not committed to Git)
├── .env.vercel.local            ← Environment variables for Vercel on local machine (not committed to Git)
├── .env.tauri.local              ← Environment variables for Tauri on local machine (not committed to Git)
├── .env.local.local               ← Local environment variables for local development (not committed to Git)
```

### 4.2 Core Engine (@agentOS/core)

Zero UI dependencies. Pure TypeScript. All interfaces consume this package.

**Modules:**
- `Orchestrator` — reads task, plans execution, dispatches agents
- `AgentSpawner` — spawns Claude API calls with typed I/O contracts
- `StateManager` — reads/writes phase checkpoints (SQLite local or Supabase cloud)
- `Tracer` — records token usage, latency, cost per agent per task
- `RepoAnalyzer` — static AST analysis of codebase on first boot
- `PRDParser` — converts structured PRD into typed task DAG
- `WorkflowEngine` — phase-gated execution with human approval gates

### 4.3 Agent Hierarchy (Tiered Thinking)

| Role | Model | Thinking Budget | Responsibility |
|------|-------|----------------|----------------|
| Orchestrator | claude-opus-4 | 63,999 tokens | Plans mission, builds task DAG |
| Planner | claude-sonnet-4-5 | 16,000 tokens | Domain planning, subtask breakdown |
| Developer | claude-sonnet-4-5 | 16,000 tokens | Writes code, creates files |
| Tester | claude-haiku-4 | 4,000 tokens | Generates and runs tests |
| Reviewer | claude-haiku-4 | 0 tokens | Pattern checks, lint, formatting |
| Debugger | claude-sonnet-4-5 | 32,000 tokens | Root cause analysis, parallel hypotheses |

### 4.4 Workflow Phases (Phase-Gated)

Every task runs through 5 phases. Each writes a checkpoint before advancing.

```
[1. Analyze] → [2. Plan + APPROVE] → [3. Implement] → [4. Test] → [5. Review]
     ↓                  ↓                   ↓              ↓            ↓
checkpoint          human gate          checkpoint     checkpoint   checkpoint
```

If any phase fails → resume from last checkpoint, no full restart.
Phase 2 always requires human approval before code is written.

---

## 5. Interface Specifications

### 5.1 CLI / TUI (v1.0 — Ship First)

**Install:**
```bash
pnpm install -g agentOS
# or
npx agentOS
```

**Commands:**
```bash
agentOS init                        # scaffold AGENTS.md + config
agentOS run "add Stripe payments"   # launch swarm
agentOS run --prd ./prd.md          # run from PRD file
agentOS status                      # show active swarm
agentOS logs [task-id]              # view agent logs
agentOS cost [task-id]              # breakdown token cost
agentOS agents list                 # show available agent roles
agentOS pause                       # pause active swarm
agentOS resume                      # resume from checkpoint
```

**TUI Layout (Ink/React):**
```
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
│  [y] Approve   [e] Edit   [n] Reject   [?] Show full plan               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Keyboard Shortcuts:**
- `y/n` — approve/reject phase gate
- `p` — pause swarm
- `k` — kill specific agent
- `l` — toggle log pane
- `c` — show cost breakdown
- `q` — quit (swarm continues in background)

### 5.2 Web Dashboard (v1.5)

Next.js 15 app, hosted on Vercel, auth via Supabase.

**Pages:**
- `/dashboard` — active swarms, recent tasks, total cost
- `/swarms/new` — visual workflow builder (drag & drop agents)
- `/swarms/[id]` — live swarm view (same data as TUI, in browser)
- `/prd` — paste PRD → generates task DAG visually
- `/agents` — manage agent manifests, edit YAML
- `/costs` — per-task, per-agent token cost breakdown
- `/team` — invite members, share templates
- `/settings` — Claude API key, model config, budget limits

### 5.3 Desktop App (v2.0)

Tauri v2 wrapping Next.js web app + embedded Ink terminal pane.

- Native Mac/Windows/Linux binary
- Left pane: Next.js web dashboard
- Right pane: embedded xterm.js terminal running Ink TUI
- No browser needed — fully offline-capable
- Auto-updates via Tauri updater
- Distributed via GitHub Releases + Homebrew tap

---

## 6. Technical Specifications

### 6.1 Typed I/O Contracts

Every agent handoff uses a strict TypeScript schema:

```typescript
interface AgentTask {
  id: string;
  role: AgentRole;
  input: TaskInput;
  context: CodebaseContext;
  tokenBudget: number;
  phase: WorkflowPhase;
}

interface AgentOutput {
  taskId: string;
  status: 'success' | 'failed' | 'needs_review';
  artifacts: FileArtifact[];
  tokensUsed: number;
  cost: number;
  handoffTo?: AgentRole;
  handoffPayload?: TaskInput;
}
```

### 6.2 Codebase-Aware Boot

On first `agentOS init`, the RepoAnalyzer runs a static analysis pass:
- Detects stack (Next.js, Supabase, Express, etc.)
- Extracts naming conventions, folder structure
- Identifies existing patterns (auth, API routes, DB schema)
- Writes structured context to `CLAUDE.md`
- Every spawned agent receives this context — no agent starts blind

### 6.3 Database Schema (Supabase)

**Tables:**
- `tasks` — id, prompt, status, phase, created_at, user_id
- `agents` — id, task_id, role, model, tokens_used, cost, status
- `checkpoints` — id, task_id, phase, state_json, created_at
- `artifacts` — id, task_id, agent_id, file_path, diff, created_at
- `users` — id, email, claude_api_key_enc, plan, created_at
- `teams` — id, name, owner_id, created_at
- `team_members` — team_id, user_id, role

### 6.4 AGENTS.md Format

Progressive context disclosure — each agent only loads what it needs:

```markdown
# AgentOS Context

## Project Stack
- Framework: Next.js 15, TypeScript
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Deployment: Vercel

## Agent Roles
### @orchestrator
[loads full project context]

### @developer
[loads src/ structure, existing patterns, naming conventions]

### @tester
[loads test/ structure, testing patterns only]

### @reviewer
[loads lint config, formatting rules only]
```

---

## 7. Pricing & Monetization

| Tier | Price | Limits | Target |
|------|-------|--------|--------|
| Free (OSS) | $0 | 10 tasks/month, CLI only | Solo devs, contributors |
| Pro | $29/mo | Unlimited tasks, web dashboard | Indie hackers, freelancers |
| Team | $99/mo | 10 seats, shared workspace, templates | Small teams |
| Enterprise | $500+/mo | Self-hosted, SSO, RBAC, SLA | Agencies, companies |

**Open Core Model:**
- `@agentOS/core` + CLI → fully MIT open source (drives GitHub stars)
- Web dashboard + team features → Pro/Team paid
- Self-hosted binary + enterprise features → Enterprise paid

---

## 8. Go-To-Market

### Phase 1 — Community Launch (Month 1–2)
- Ship v1.0 CLI to GitHub (target 500+ stars)
- Post on r/ClaudeAI, r/SideProject, r/typescript, Hacker News
- Demo video: "I ran one command and 6 agents built my entire auth system"
- Dev.to article: "How I built a Ruflo competitor in 2 weeks"

### Phase 2 — Product Hunt (Month 3)
- Launch web dashboard on Product Hunt
- Target: Top 5 of the day
- Goal: 100 Pro subscribers → $2,900 MRR

### Phase 3 — Enterprise (Month 4+)
- Outreach to dev agencies using Claude heavily
- Add custom model routing (Bedrock/Azure)
- Target: $10,000 MRR

---

## 9. Milestones & Timeline

| Milestone | Deliverable | Target |
|-----------|-------------|--------|
| v0.1 | @agentOS/core engine | Week 1–2 |
| v0.2 | Ink TUI on core | Week 3 |
| v1.0 | CLI public launch (GitHub + npm) | Week 4 |
| v1.5 | Next.js web dashboard | Week 6–7 |
| v2.0 | Tauri desktop app | Week 8–9 |

---

## 10. Success Metrics

| Metric | 30 Days | 90 Days | 6 Months |
|--------|---------|---------|----------|
| GitHub Stars | 500 | 2,000 | 5,000+ |
| npm downloads/week | 1,000 | 5,000 | 20,000+ |
| Pro subscribers | 20 | 100 | 300+ |
| MRR | $580 | $2,900 | $8,700+ |
| Discord members | 100 | 500 | 2,000+ |

---

## 11. Out of Scope (v1.0)

- Support for non-Claude models (GPT-4, Gemini) — v3.0 roadmap
- Mobile app
- Built-in code editor (use existing IDE + CLI)
- Agent marketplace (v2.0 roadmap)

---

*This PRD is ready to be dropped directly into Claude Code as the initial prompt to scaffold the full repository.*