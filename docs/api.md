# @agentos/core API Reference

## WorkflowEngine

```typescript
import { WorkflowEngine } from '@agentos/core';
```

### Constructor

```typescript
new WorkflowEngine(options: WorkflowEngineOptions)
```

| Option | Type | Required | Description |
| ------ | ---- | -------- | ----------- |
| `apiKey` | `string` | yes | Anthropic API key |
| `context` | `CodebaseContext` | yes | Codebase context from `RepoAnalyzer` |
| `stateDir` | `string` | no | Override SQLite state directory |

### Methods

#### `run(nodes, opts?): Promise<string>`

Executes the workflow. Returns `taskId` when complete.

```typescript
const taskId = await engine.run(nodes, {
  resumeFrom: 'implement',   // skip analyze + plan, start from implement
});
```

#### `approve(taskId): void`

Unblocks the `human_approval_required` gate. Call after the user approves the plan.

#### `reject(taskId, reason): void`

Rejects the plan. The workflow emits `human_rejected` and throws `PhaseError`.

#### `on(event, handler): this`

Subscribe to `WorkflowEvent` emissions.

```typescript
engine.on('event', (e: WorkflowEvent) => { ... });
```

---

## PRDParser

```typescript
import { PRDParser } from '@agentos/core';

const parser = new PRDParser();

// Parse a markdown PRD file
const { tasks } = parser.parse(markdownString);

// Parse a plain-text prompt
const { tasks } = parser.parsePrompt('Add Stripe payments');
```

Returns `{ tasks: TaskNode[] }` where each `TaskNode` has:

```typescript
interface TaskNode {
  id: string;
  title: string;
  description: string;
  phase: WorkflowPhase;
  dependencies: string[];   // IDs of prerequisite nodes
}
```

---

## RepoAnalyzer

```typescript
import { RepoAnalyzer } from '@agentos/core';

const analyzer = new RepoAnalyzer(process.cwd());
const context = analyzer.analyze();
// context: CodebaseContext — passed to WorkflowEngine
```

`analyze()` is synchronous. It reads `package.json`, scans top-level `src/` structure, and
returns a `CodebaseContext` describing the detected stack, conventions, and folder layout. It also
writes/updates `CLAUDE.md` in the project root.

---

## StateManager

```typescript
import { StateManager } from '@agentos/core';

const state = new StateManager();
// Auto-detects SQLite vs Supabase from env

await state.saveCheckpoint({ taskId, phase, stateJson, createdAt });
const cp = await state.loadCheckpoint(taskId, 'plan');
const cps = await state.listCheckpoints(taskId);
const ids = await state.listTaskIds();
await state.deleteCheckpoints(taskId);
```

---

## Tracer

```typescript
import { Tracer } from '@agentos/core';

const tracer = new Tracer();
// Pass to WorkflowEngine — it records all agent invocations automatically

const summary = tracer.getSummary(taskId);
// { totalCost: number, totalTokens: number, byPhase: Record<WorkflowPhase, PhaseSummary> }
```

---

## MODEL_REGISTRY

```typescript
import { MODEL_REGISTRY, calculateCost } from '@agentos/core';

const cfg = MODEL_REGISTRY['developer'];
// { model: 'claude-sonnet-4-5', thinkingBudget: 16000, inputCostPerMillion: 3, outputCostPerMillion: 15 }

const cost = calculateCost('developer', inputTokens, outputTokens);
// returns cost in USD
```

---

## Types

```typescript
type AgentRole = 'orchestrator' | 'planner' | 'developer' | 'tester' | 'reviewer' | 'debugger';

type WorkflowPhase = 'analyze' | 'plan' | 'implement' | 'test' | 'review';

type WorkflowEvent =
  | { type: 'phase_started';             taskId: string; phase: WorkflowPhase }
  | { type: 'phase_completed';           taskId: string; phase: WorkflowPhase }
  | { type: 'phase_failed';              taskId: string; phase: WorkflowPhase; error: string }
  | { type: 'human_approval_required';   taskId: string; phase: WorkflowPhase; summary: string }
  | { type: 'human_approved';            taskId: string; phase: WorkflowPhase }
  | { type: 'human_rejected';            taskId: string; phase: WorkflowPhase; reason: string }
  | { type: 'agent_spawned';             taskId: string; phase: WorkflowPhase; role: AgentRole }
  | { type: 'token_usage';               taskId: string; phase: WorkflowPhase; role: AgentRole;
      inputTokens: number; outputTokens: number; cost: number }
  | { type: 'task_completed';            taskId: string; totalCost: number }
  | { type: 'task_failed';               taskId: string; error: string };
```

---

## Error Types

All errors extend `AgentOSError`:

```typescript
import { AgentOSError, PhaseError, SpawnError, StateError } from '@agentos/core';

// PhaseError — thrown when a workflow phase fails
// SpawnError — thrown when AgentSpawner fails to call the API
// StateError — thrown when StateManager can't read/write
```

Each error has a typed `code` property for programmatic handling:

```typescript
try {
  await engine.run(nodes);
} catch (err) {
  if (err instanceof PhaseError) {
    console.error(`Phase ${err.phase} failed: ${err.message}`);
    // resume from checkpoint
    await engine.run(nodes, { resumeFrom: err.phase });
  }
}
```
