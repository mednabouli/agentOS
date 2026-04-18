const R = '\x1b[0m';

export function bold(s: string): string { return `\x1b[1m${s}${R}`; }
export function dim(s: string): string { return `\x1b[2m${s}${R}`; }
export function green(s: string): string { return `\x1b[32m${s}${R}`; }
export function yellow(s: string): string { return `\x1b[33m${s}${R}`; }
export function cyan(s: string): string { return `\x1b[36m${s}${R}`; }
export function red(s: string): string { return `\x1b[31m${s}${R}`; }

export function printHelp(): void {
  console.log(`
${bold('AgentOS')} v1.0.0 — multi-agent AI orchestration for Claude

${bold('Usage:')} agentos <command> [options]

${bold('Commands:')}
  ${cyan('init')}               Scaffold .agentOS/ config, analyze codebase
  ${cyan('run')} <prompt>       Launch agent swarm from a prompt
  ${cyan('run')} --prd <path>   Launch agent swarm from a PRD file
  ${cyan('status')}             Show last task and phase progress
  ${cyan('logs')} [task-id]     View phase checkpoint history
  ${cyan('cost')} [task-id]     Show per-phase token cost breakdown
  ${cyan('agents list')}        List available agent roles and models
  ${cyan('pause')}              Pause the active swarm (press p in TUI)
  ${cyan('resume')}             Resume from last checkpoint

${bold('Examples:')}
  agentos init
  agentos run "add Stripe payments to the checkout flow"
  agentos run --prd ./features/auth.md
  agentos status
  agentos cost

${dim('Set ANTHROPIC_API_KEY or add apiKey to .agentOS/config.yaml')}
`);
}
