import type { WorkflowPhase } from '../types/index.js';

export const PHASES: readonly WorkflowPhase[] = [
  'analyze',
  'plan',
  'implement',
  'test',
  'review',
] as const;

/** Phases that require explicit human approval before the engine advances */
export const REQUIRES_APPROVAL: ReadonlySet<WorkflowPhase> = new Set<WorkflowPhase>([
  'plan',
]);

export function requiresApproval(phase: WorkflowPhase): boolean {
  return REQUIRES_APPROVAL.has(phase);
}

export function nextPhase(phase: WorkflowPhase): WorkflowPhase | null {
  const idx = PHASES.indexOf(phase);
  if (idx === -1 || idx === PHASES.length - 1) return null;
  const next = PHASES[idx + 1];
  return next ?? null;
}

export function isValidPhase(value: unknown): value is WorkflowPhase {
  return typeof value === 'string' && (PHASES as readonly string[]).includes(value);
}
