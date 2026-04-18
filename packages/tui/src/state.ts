import type { AgentRole, WorkflowEvent, WorkflowPhase } from '@agentos/core';
import { getModelConfig } from '@agentos/core';

export type PhaseRunStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AgentEntry {
  id: string;
  role: AgentRole;
  phase: WorkflowPhase;
}

export interface TokenEntry {
  thinkingTokens: number;
  thinkingBudget: number;
}

export interface PendingApproval {
  taskId: string;
  phase: WorkflowPhase;
  summary: string;
}

type PhaseStatusMap = Record<WorkflowPhase, PhaseRunStatus>;

function makeInitialPhaseStatus(): PhaseStatusMap {
  return {
    analyze: 'idle',
    plan: 'idle',
    implement: 'idle',
    test: 'idle',
    review: 'idle',
  };
}

export interface TuiState {
  taskId: string | null;
  currentPhase: WorkflowPhase | null;
  phaseStatus: PhaseStatusMap;
  agents: AgentEntry[];
  tokenUsage: Partial<Record<AgentRole, TokenEntry>>;
  totalCost: number;
  logs: string[];
  pendingApproval: PendingApproval | null;
  completed: boolean;
  failedReason: string | null;
  showLogs: boolean;
}

export function initialState(): TuiState {
  return {
    taskId: null,
    currentPhase: null,
    phaseStatus: makeInitialPhaseStatus(),
    agents: [],
    tokenUsage: {},
    totalCost: 0,
    logs: [],
    pendingApproval: null,
    completed: false,
    failedReason: null,
    showLogs: true,
  };
}

export type TuiAction =
  | { type: 'workflow_event'; event: WorkflowEvent }
  | { type: 'toggle_logs' };

const MAX_LOGS = 100;

function addLog(logs: string[], msg: string): string[] {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  return [...logs, `[${ts}] ${msg}`].slice(-MAX_LOGS);
}

export function tuiReducer(state: TuiState, action: TuiAction): TuiState {
  if (action.type === 'toggle_logs') {
    return { ...state, showLogs: !state.showLogs };
  }

  const { event } = action;

  switch (event.type) {
    case 'phase_started': {
      return {
        ...state,
        taskId: state.taskId ?? event.taskId,
        currentPhase: event.phase,
        phaseStatus: { ...state.phaseStatus, [event.phase]: 'running' },
        logs: addLog(state.logs, `Phase started: ${event.phase}`),
      };
    }

    case 'phase_completed': {
      return {
        ...state,
        phaseStatus: { ...state.phaseStatus, [event.phase]: 'completed' },
        logs: addLog(state.logs, `Phase completed: ${event.phase}`),
      };
    }

    case 'phase_failed': {
      return {
        ...state,
        phaseStatus: { ...state.phaseStatus, [event.phase]: 'failed' },
        logs: addLog(state.logs, `Phase failed: ${event.phase} — ${event.error}`),
      };
    }

    case 'human_approval_required': {
      return {
        ...state,
        pendingApproval: {
          taskId: event.taskId,
          phase: event.phase,
          summary: event.summary,
        },
        logs: addLog(state.logs, `Approval required for phase: ${event.phase}`),
      };
    }

    case 'human_approved': {
      return {
        ...state,
        pendingApproval: null,
        logs: addLog(state.logs, `Plan approved`),
      };
    }

    case 'human_rejected': {
      const reason = 'reason' in event ? event.reason : undefined;
      return {
        ...state,
        pendingApproval: null,
        logs: addLog(
          state.logs,
          reason !== undefined ? `Plan rejected: ${reason}` : `Plan rejected`,
        ),
      };
    }

    case 'task_completed': {
      return {
        ...state,
        completed: true,
        totalCost: event.totalCost,
        logs: addLog(state.logs, `Task completed. Total cost: $${event.totalCost.toFixed(4)}`),
      };
    }

    case 'task_failed': {
      return {
        ...state,
        failedReason: event.error,
        logs: addLog(state.logs, `Task failed: ${event.error}`),
      };
    }

    case 'agent_spawned': {
      const phase = state.currentPhase ?? 'analyze';
      return {
        ...state,
        agents: [
          ...state.agents,
          { id: event.agentId, role: event.role, phase },
        ],
        logs: addLog(state.logs, `Agent spawned: ${event.role}`),
      };
    }

    case 'token_usage': {
      const { role, usage, cost } = event;
      const config = getModelConfig(role);
      const existing = state.tokenUsage[role] ?? {
        thinkingTokens: 0,
        thinkingBudget: config.thinkingBudget,
      };
      return {
        ...state,
        tokenUsage: {
          ...state.tokenUsage,
          [role]: {
            thinkingTokens: existing.thinkingTokens + usage.thinkingTokens,
            thinkingBudget: existing.thinkingBudget,
          },
        },
        totalCost: state.totalCost + cost,
        logs: addLog(
          state.logs,
          `[${role}] ${usage.inputTokens + usage.outputTokens} tokens, $${cost.toFixed(5)}`,
        ),
      };
    }

    default:
      return state;
  }
}
