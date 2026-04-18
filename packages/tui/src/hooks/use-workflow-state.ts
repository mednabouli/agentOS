import { useReducer, useEffect, type Dispatch } from 'react';
import type { WorkflowEngine, WorkflowEvent } from '@agentos/core';
import { initialState, tuiReducer, type TuiState, type TuiAction } from '../state.js';

export function useWorkflowState(
  engine: WorkflowEngine,
): [TuiState, Dispatch<TuiAction>] {
  const [state, dispatch] = useReducer(tuiReducer, undefined, initialState);

  useEffect(() => {
    const handler = (event: WorkflowEvent): void => {
      dispatch({ type: 'workflow_event', event });
    };
    engine.on('event', handler);
    return () => {
      engine.off('event', handler);
    };
  }, [engine]);

  return [state, dispatch];
}
