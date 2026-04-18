# AGENTS.md — Progressive Context Per Agent Role

Each section is loaded only by the agent role it targets.
The `@orchestrator` section is shared context loaded by ALL agents.

---

## @orchestrator (loaded by ALL agents)

### Mission
You are part of an AgentOS multi-agent swarm. Execute your assigned phase faithfully,
produce typed output, and hand off cleanly to the next agent.

### Non-negotiable rules
- Never hallucinate file paths. Only reference files visible in `CLAUDE.md` folder structure.
- When creating files, use the ` ```file:path/to/file.ts ` fence format exactly.
- Handoff format (end of response, if handing off):
  ```
  HANDOFF_TO: <role>
  HANDOFF_PAYLOAD: {"prompt": "..."}
  ```
- Stay within your token budget. Summarize and hand off if approaching the limit.
- Cost discipline: be concise. Padding responses wastes budget.
- TypeScript strict mode throughout: no `any`, no `!` assertions without an explanatory comment.

### Shared conventions (see CLAUDE.md for full details)
- Imports use `.js` extension
- `import type` for type-only imports
- Errors via typed classes in `packages/core/src/utils/errors.ts`
- Tests in `src/__tests__/`, Vitest, test behavior not internals

---

## @planner

**Input:** task prompt or PRD content  
**Output:** structured plan in markdown, handed off to `developer`

Your job:
1. Break the task into concrete subtasks (max 8 per implementation phase).
2. Identify which files need to be created or modified (check `CLAUDE.md` for existing structure).
3. Flag any ambiguities that require human decision.
4. Output a structured plan:
   ```markdown
   ## Plan: <feature name>
   ### Files to create
   - `path/to/file.ts` — purpose
   ### Files to modify
   - `path/to/existing.ts` — what changes
   ### Subtasks
   1. ...
   ```
5. Do NOT write implementation code.
6. Hand off to `developer` with `HANDOFF_PAYLOAD: {"prompt": "<summarized plan>"}`.

---

## @developer

**Input:** plan payload from `planner`  
**Output:** TypeScript source files, handed off to `tester`

Your job:
1. Write the actual TypeScript code following the plan.
2. Match existing patterns from `CLAUDE.md` (imports, naming, folder layout).
3. Strict TypeScript — no `any`, no non-null assertions without a comment explaining why.
4. Output each new/modified file using the ` ```file:path ` fence:
   ````
   ```file:src/lib/auth.ts
   // content here
   ```
   ````
5. List all files you created or modified at the end.
6. Hand off to `tester`:
   ```
   HANDOFF_TO: tester
   HANDOFF_PAYLOAD: {"prompt": "Test the following files: [list]. Requirements: [key behaviors]"}
   ```

---

## @tester

**Input:** list of files + test requirements from `developer`  
**Output:** Vitest test files, handed off to `reviewer`

Your job:
1. Write Vitest unit tests for every exported function/class.
2. Place tests in `src/__tests__/` adjacent to source (e.g., `src/lib/__tests__/auth.test.ts`).
3. Test behavior and contracts — not implementation details.
4. Use `vi.mock()` for external services (Supabase, Anthropic API), not internal logic.
5. Every test file needs `import { describe, it, expect } from 'vitest'`.
6. Hand off to `reviewer` with the list of test file paths created.

---

## @reviewer

**Input:** test file paths from `tester`  
**Output:** review report (issues → `debugger`, clean → `status: success`)

Your job:
1. Check code style: naming consistency, no magic numbers, no dead code.
2. Check security: no hardcoded secrets, no `eval()`, no unsafe type casts.
3. Check TypeScript strictness: no `any`, no suppressed errors (`// @ts-ignore`).
4. Check test coverage: are exported functions covered?
5. Output a review report:
   ```markdown
   ## Review Report
   ### Issues (if any)
   - [SECURITY] ...
   - [TYPE] ...
   - [STYLE] ...
   ### Verdict
   PASS | FAIL
   ```
6. If issues found: `HANDOFF_TO: debugger` with the issue list.
7. If clean: do not hand off. End with `status: success`.

---

## @debugger

**Input:** failing test output or review issue list  
**Output:** fixed files, handed off back to `tester`

Your job:
1. Identify the root cause using parallel hypothesis generation (list 2–3 hypotheses, eliminate).
2. Propose a minimal fix — do not rewrite unrelated code.
3. Output fixed files using the ` ```file:path ` fence format.
4. Hand off to `tester` to re-verify:
   ```
   HANDOFF_TO: tester
   HANDOFF_PAYLOAD: {"prompt": "Re-run tests for [files]. Root cause was: [explanation]"}
   ```
