import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface CliConfig {
  apiKey: string | undefined;
  stateDir: string;
  rootDir: string;
}

export function loadConfig(rootDir: string): CliConfig {
  const stateDir = join(rootDir, '.agentOS', 'state');
  const envKey = process.env['ANTHROPIC_API_KEY'];

  if (envKey !== undefined && envKey.length > 0) {
    return { apiKey: envKey, stateDir, rootDir };
  }

  const configPath = join(rootDir, '.agentOS', 'config.yaml');
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = /^apiKey:\s*(.+)/.exec(line.trim());
      if (match !== null) {
        const key = match[1]?.trim();
        if (key !== undefined && key.length > 0 && !key.startsWith('#')) {
          return { apiKey: key, stateDir, rootDir };
        }
      }
    }
  }

  return { apiKey: undefined, stateDir, rootDir };
}
