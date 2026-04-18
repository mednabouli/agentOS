import { writeFileSync } from 'node:fs';
import { TemplateRegistry, resolveTemplate, validateVars } from '@agentos/core';
import type { TemplateVars } from '@agentos/core';
import { WorkflowEngine, RepoAnalyzer } from '@agentos/core';
import { runTui } from '@agentos/tui';
import { loadConfig } from '../lib/config.js';
import { saveActiveTask } from '../lib/active-task.js';
import { bold, red, green, cyan, dim } from '../lib/format.js';

function parseVars(args: string[]): TemplateVars {
  const vars: TemplateVars = {};
  for (const arg of args) {
    const eqIdx = arg.indexOf('=');
    if (eqIdx === -1) continue;
    const key = arg.slice(0, eqIdx).trim().toUpperCase();
    const value = arg.slice(eqIdx + 1).trim();
    vars[key] = value;
  }
  return vars;
}

export async function runTemplate(args: string[], rootDir: string): Promise<void> {
  const registry = new TemplateRegistry(rootDir + '/.agentOS');
  const [subcommand, ...rest] = args;

  switch (subcommand) {
    case 'list':
    case 'ls':
      return cmdList(registry, rest);

    case 'show':
    case 'info':
      return cmdShow(registry, rest);

    case 'search':
      return cmdSearch(registry, rest);

    case 'use':
    case 'run':
      return cmdUse(registry, rest, rootDir);

    case 'install':
    case 'add':
      return cmdInstall(registry, rest);

    case 'uninstall':
    case 'remove':
      return cmdUninstall(registry, rest);

    case 'export':
      return cmdExport(registry, rest);

    default:
      printTemplateHelp();
      if (subcommand !== undefined && subcommand !== '--help' && subcommand !== '-h') {
        console.error(red('Error:') + ` Unknown template subcommand: ${subcommand}`);
        process.exit(1);
      }
  }
}

function cmdList(registry: TemplateRegistry, args: string[]): void {
  const tag = args.find((a) => !a.startsWith('-'));
  const templates = tag !== undefined ? registry.search(tag) : registry.list();

  if (templates.length === 0) {
    console.log(dim('No templates found.'));
    return;
  }

  const idW = 20;
  const nameW = 28;
  console.log(
    dim(
      `${'ID'.padEnd(idW)}  ${'NAME'.padEnd(nameW)}  TAGS`,
    ),
  );
  console.log(dim('─'.repeat(70)));

  for (const t of templates) {
    const id = t.id.padEnd(idW);
    const name = t.name.slice(0, nameW).padEnd(nameW);
    const tags = t.tags.join(', ');
    console.log(`${cyan(id)}  ${name}  ${dim(tags)}`);
  }

  console.log(dim(`\n${templates.length} template(s). Use 'agentos template show <id>' for details.`));
}

function cmdShow(registry: TemplateRegistry, args: string[]): void {
  const id = args[0];
  if (id === undefined) {
    console.error(red('Error:') + ' Usage: agentos template show <id>');
    process.exit(1);
  }

  const t = registry.get(id);
  if (t === null) {
    console.error(red('Error:') + ` Template not found: ${id}`);
    process.exit(1);
  }

  console.log(`\n${bold(t.name)} ${dim(`v${t.version}`)} by ${t.author}`);
  console.log(`${t.description}\n`);
  console.log(dim('Tags:   ') + t.tags.join(', '));
  console.log(dim('Phases: ') + [...new Set(t.nodes.map((n) => n.phase))].join(' → '));
  console.log(dim('Agents: ') + t.nodes.map((n) => n.role).join(', '));

  if (t.variables.length > 0) {
    console.log(`\n${bold('Variables:')}`);
    for (const v of t.variables) {
      const req = v.required ? red('*required') : dim(`default: ${v.default ?? 'none'}`);
      console.log(`  ${cyan(v.name.padEnd(24))} ${v.description} (${req})`);
    }
  }

  console.log(dim(`\nRun with: agentos template use ${t.id} VAR=value ...`));
}

function cmdSearch(registry: TemplateRegistry, args: string[]): void {
  const query = args.join(' ').trim();
  if (query.length === 0) {
    console.error(red('Error:') + ' Usage: agentos template search <query>');
    process.exit(1);
  }
  cmdList(registry, [query]);
}

async function cmdUse(registry: TemplateRegistry, args: string[], rootDir: string): Promise<void> {
  const id = args[0];
  if (id === undefined) {
    console.error(red('Error:') + ' Usage: agentos template use <id> [VAR=value ...]');
    process.exit(1);
  }

  const template = registry.get(id);
  if (template === null) {
    console.error(red('Error:') + ` Template not found: ${id}`);
    console.error(dim('  Run: agentos template list'));
    process.exit(1);
  }

  const vars = parseVars(args.slice(1));

  // Fill defaults for missing variables
  for (const v of template.variables) {
    if (vars[v.name] === undefined && v.default !== undefined) {
      vars[v.name] = v.default;
    }
  }

  const missing = validateVars(template, vars);
  if (missing.length > 0) {
    console.error(red('Error:') + ' Missing required template variables:');
    for (const name of missing) {
      const def = template.variables.find((v) => v.name === name);
      console.error(`  ${cyan(name)}: ${def?.description ?? ''}`);
    }
    console.error(dim(`\nPass as: agentos template use ${id} ${missing.map((n) => `${n}=value`).join(' ')}`));
    process.exit(1);
  }

  const nodes = resolveTemplate(template, vars);

  const config = loadConfig(rootDir);
  if (config.apiKey === undefined) {
    console.error(red('Error:') + ' ANTHROPIC_API_KEY not set. Run: agentos init');
    process.exit(1);
  }

  process.env['AGENTOS_STATE_DIR'] = config.stateDir;

  const analyzer = new RepoAnalyzer(rootDir);
  const context = analyzer.analyze();
  const engine = new WorkflowEngine({ apiKey: config.apiKey, context });

  console.log(`\n${green('⚡')} Running template ${bold(template.name)}\n`);

  const taskId = await runTui(engine, nodes);

  saveActiveTask(config.stateDir, {
    taskId,
    startedAt: new Date().toISOString(),
    prompt: `template:${id}`,
    nodes,
  });
}

function cmdInstall(registry: TemplateRegistry, args: string[]): void {
  const source = args[0];
  if (source === undefined) {
    console.error(red('Error:') + ' Usage: agentos template install <path-to-template.json>');
    process.exit(1);
  }

  const template = registry.installFromFile(source);
  console.log(green('✓') + ` Installed template: ${bold(template.name)} (${template.id})`);
}

function cmdUninstall(registry: TemplateRegistry, args: string[]): void {
  const id = args[0];
  if (id === undefined) {
    console.error(red('Error:') + ' Usage: agentos template uninstall <id>');
    process.exit(1);
  }

  const removed = registry.uninstall(id);
  if (removed) {
    console.log(green('✓') + ` Uninstalled template: ${id}`);
  } else {
    console.error(red('Error:') + ` Template not found in local registry: ${id}`);
    process.exit(1);
  }
}

function cmdExport(registry: TemplateRegistry, args: string[]): void {
  const id = args[0];
  const outPath = args[1] ?? `${id}.json`;

  if (id === undefined) {
    console.error(red('Error:') + ' Usage: agentos template export <id> [output.json]');
    process.exit(1);
  }

  const template = registry.get(id);
  if (template === null) {
    console.error(red('Error:') + ` Template not found: ${id}`);
    process.exit(1);
  }

  writeFileSync(outPath, JSON.stringify(template, null, 2), 'utf-8');
  console.log(green('✓') + ` Exported template to: ${outPath}`);
}

function printTemplateHelp(): void {
  console.log(`
${bold('agentos template')} — Browse, install, and run workflow templates

${bold('USAGE')}
  agentos template <subcommand> [options]

${bold('SUBCOMMANDS')}
  list [tag]                  List available templates (filter by tag)
  show <id>                   Show template details and required variables
  search <query>              Search templates by name, description, or tag
  use <id> [VAR=value ...]    Run a template with variable substitution
  install <file>              Install a template from a local JSON file
  uninstall <id>              Remove an installed template
  export <id> [output.json]   Export a template to a JSON file

${bold('EXAMPLES')}
  agentos template list
  agentos template list payments
  agentos template show add-payments
  agentos template use add-payments PAYMENT_PROVIDER=Stripe FEATURE=subscriptions
  agentos template install ./my-template.json
`);
}
