import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentRole } from '../types/index.js';
import type { ProviderType, ProviderCredentials } from '../providers/types.js';

export interface RouteEntry {
  provider: ProviderType;
  model?: string | undefined;
  credentials?: ProviderCredentials | undefined;
}

export type RoutingConfig = Partial<Record<AgentRole, RouteEntry>>;

const ENV_PREFIX = 'AGENTOS_ROUTE_';

function parseEnvRoutes(): RoutingConfig {
  const routing: RoutingConfig = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(ENV_PREFIX) || value === undefined) continue;
    const role = key.slice(ENV_PREFIX.length).toLowerCase() as AgentRole;
    const colonIdx = value.indexOf(':');
    const provider = (colonIdx === -1 ? value : value.slice(0, colonIdx)) as ProviderType;
    const model = colonIdx === -1 ? undefined : value.slice(colonIdx + 1);
    routing[role] = { provider, ...(model !== undefined && model.length > 0 ? { model } : {}) };
  }
  return routing;
}

/**
 * Load routing config from .agentOS/routing.json (file) and
 * AGENTOS_ROUTE_<ROLE>=<provider>:<model> env vars (override).
 * Pass the .agentOS directory path (not the state sub-dir).
 */
export function loadRoutingConfig(agentosDir?: string | undefined): RoutingConfig {
  const envRoutes = parseEnvRoutes();

  const dir = agentosDir ?? join(process.cwd(), '.agentOS');
  const configPath = join(dir, 'routing.json');

  if (existsSync(configPath)) {
    try {
      const fileRoutes = JSON.parse(readFileSync(configPath, 'utf-8')) as RoutingConfig;
      // Env vars override file-based config
      return { ...fileRoutes, ...envRoutes };
    } catch {
      // ignore malformed file — fall through to env-only
    }
  }

  return envRoutes;
}

export function resolveRoute(
  role: AgentRole,
  routing: RoutingConfig,
): { provider: ProviderType; model: string | undefined; credentials: ProviderCredentials } {
  const entry = routing[role];
  return {
    provider: entry?.provider ?? 'anthropic',
    model: entry?.model,
    credentials: entry?.credentials ?? {},
  };
}
