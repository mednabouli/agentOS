import { useEffect, useReducer } from 'react';
import { onWorkflowEvent, type WorkflowEventPayload } from '../lib/bridge';
import type { UnlistenFn } from '@tauri-apps/api/event';

export interface PendingApproval {
  taskId: string;
  phase: string;
  summary: string;
}

export interface TauriEventState {
  activeTaskId: string | null;
  currentPhase: string | null;
  totalCost: number;
  pendingApproval: PendingApproval | null;
  eventLog: WorkflowEventPayload[];
}

type Action =
  | { type: 'event'; payload: WorkflowEventPayload }
  | { type: 'reset' };

function reducer(state: TauriEventState, action: Action): TauriEventState {
  if (action.type === 'reset') {
    return { activeTaskId: null, currentPhase: null, totalCost: 0, pendingApproval: null, eventLog: [] };
  }

  const e = action.payload;
  const next: TauriEventState = {
    ...state,
    eventLog: [...state.eventLog, e],
  };

  if (e.taskId !== undefined) next.activeTaskId = e.taskId;

  if (e.type === 'phase_started' && e.phase !== undefined) {
    next.currentPhase = e.phase;
  }
  if (e.type === 'phase_completed') {
    next.currentPhase = null;
  }
  if (e.type === 'task_completed') {
    next.currentPhase = null;
    next.totalCost = e.totalCost ?? state.totalCost;
  }
  if (e.type === 'human_approval_required' && e.taskId !== undefined && e.phase !== undefined) {
    next.pendingApproval = {
      taskId: e.taskId,
      phase: e.phase,
      summary: e.summary ?? '',
    };
  }
  if (e.type === 'human_approved' || e.type === 'human_rejected') {
    next.pendingApproval = null;
  }

  return next;
}

const initialState: TauriEventState = {
  activeTaskId: null,
  currentPhase: null,
  totalCost: 0,
  pendingApproval: null,
  eventLog: [],
};

export function useTauriEvents(): TauriEventState {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    onWorkflowEvent((event) => {
      dispatch({ type: 'event', payload: event });
    })
      .then((fn) => { unlisten = fn; })
      .catch(() => {/* not in Tauri context — dev/test environment */});

    return () => { unlisten?.(); };
  }, []);

  return state;
}
