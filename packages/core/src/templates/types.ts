import type { TaskNode } from '../types/index.js';

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  default?: string | undefined;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  variables: TemplateVariable[];
  /** TaskNode DAG — may contain {{VARIABLE}} placeholders in input.prompt */
  nodes: TaskNode[];
  /** Optional PRD markdown content with {{VARIABLE}} placeholders */
  prdContent?: string | undefined;
}

export interface MarketplaceEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  downloadUrl: string;
}

export interface MarketplaceCatalog {
  version: string;
  templates: MarketplaceEntry[];
}

export type TemplateVars = Record<string, string>;
