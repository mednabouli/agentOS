import { StateManager } from '@agentos/core';

declare global {
  // eslint-disable-next-line no-var
  var __agentosDb: StateManager | undefined;
}

export function getDb(): StateManager {
  if (global.__agentosDb === undefined) {
    const stateDir =
      process.env['AGENTOS_STATE_DIR'] ??
      `${process.cwd()}/.agentOS/state`;
    process.env['AGENTOS_STATE_DIR'] = stateDir;
    global.__agentosDb = new StateManager();
  }
  return global.__agentosDb;
}
