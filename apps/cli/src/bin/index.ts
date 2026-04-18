#!/usr/bin/env node

// AgentOS CLI — v0.1 stub
// Full implementation in Week 4 milestone
//
// Planned commands:
//   agentos init
//   agentos run <prompt>
//   agentos run --prd <path>
//   agentos status
//   agentos logs [task-id]
//   agentos cost [task-id]
//   agentos pause / resume
//   agentos agents list

const [,, command, ...args] = process.argv;

if (command === undefined || command === '--help' || command === '-h') {
  console.log(`
AgentOS v0.0.1

Usage: agentos <command> [options]

Commands:
  init              Scaffold AGENTS.md + config
  run <prompt>      Launch agent swarm
  run --prd <path>  Run from PRD file
  status            Show active swarm
  logs [task-id]    View agent logs
  cost [task-id]    Token cost breakdown
  pause             Pause active swarm
  resume            Resume from checkpoint

Run 'agentos <command> --help' for more information.
`);
  process.exit(0);
}

console.error(`Command '${command}' is not yet implemented. Check back in v0.2.`);
void args;
process.exit(1);
