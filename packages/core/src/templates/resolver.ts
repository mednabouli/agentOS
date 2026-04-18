import type { AgentTemplate, TemplateVars } from './types.js';
import type { TaskNode } from '../types/index.js';

const PLACEHOLDER_RE = /\{\{([A-Z0-9_]+)\}\}/g;

function substitute(text: string, vars: TemplateVars): string {
  return text.replace(PLACEHOLDER_RE, (_, name: string) => vars[name] ?? `{{${name}}}`);
}

/** Validate that all required variables are supplied. Returns missing names. */
export function validateVars(template: AgentTemplate, vars: TemplateVars): string[] {
  return template.variables
    .filter((v) => v.required && (vars[v.name] === undefined || vars[v.name]!.trim().length === 0))
    .map((v) => v.name);
}

/** Return a copy of the template's nodes with all {{VARIABLE}} placeholders resolved. */
export function resolveTemplate(template: AgentTemplate, vars: TemplateVars): TaskNode[] {
  const merged: TemplateVars = {};
  for (const v of template.variables) {
    merged[v.name] = vars[v.name] ?? v.default ?? `{{${v.name}}}`;
  }

  return template.nodes.map((node) => ({
    ...node,
    input: {
      ...node.input,
      prompt: substitute(node.input.prompt, merged),
      ...(node.input.context !== undefined
        ? { context: substitute(node.input.context, merged) }
        : {}),
    },
  }));
}
