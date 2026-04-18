import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentTemplate, MarketplaceCatalog } from './types.js';
import { BUILT_IN_TEMPLATES } from './built-in.js';

export class TemplateRegistry {
  private readonly localDir: string;

  constructor(agentosDir?: string | undefined) {
    this.localDir = join(agentosDir ?? join(process.cwd(), '.agentOS'), 'templates');
  }

  /** All templates: built-ins first, then user-installed (installed overrides by id). */
  list(): AgentTemplate[] {
    const local = this.loadLocal();
    const localIds = new Set(local.map((t) => t.id));
    const builtins = BUILT_IN_TEMPLATES.filter((t) => !localIds.has(t.id));
    return [...builtins, ...local];
  }

  get(id: string): AgentTemplate | null {
    return this.list().find((t) => t.id === id) ?? null;
  }

  search(query: string): AgentTemplate[] {
    const q = query.toLowerCase();
    return this.list().filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q)),
    );
  }

  /** Install a template from a local JSON file path. Returns the installed template. */
  installFromFile(filePath: string): AgentTemplate {
    const raw = readFileSync(filePath, 'utf-8');
    const template = JSON.parse(raw) as AgentTemplate;
    this.saveLocal(template);
    return template;
  }

  /** Install a template object directly (e.g. downloaded from marketplace). */
  install(template: AgentTemplate): void {
    this.saveLocal(template);
  }

  uninstall(id: string): boolean {
    const path = this.localTemplatePath(id);
    if (!existsSync(path)) return false;
    unlinkSync(path);
    return true;
  }

  /** Fetch a marketplace catalog from a URL. Returns null on failure. */
  async fetchCatalog(registryUrl: string): Promise<MarketplaceCatalog | null> {
    try {
      const resp = await fetch(registryUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'AgentOS/3.1' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) return null;
      return (await resp.json()) as MarketplaceCatalog;
    } catch {
      return null;
    }
  }

  /** Download and install a template from a marketplace entry's downloadUrl. */
  async installFromUrl(downloadUrl: string): Promise<AgentTemplate> {
    const resp = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'AgentOS/3.1' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      throw new Error(`Failed to download template: HTTP ${resp.status}`);
    }
    const template = (await resp.json()) as AgentTemplate;
    this.saveLocal(template);
    return template;
  }

  private loadLocal(): AgentTemplate[] {
    if (!existsSync(this.localDir)) return [];
    return readdirSync(this.localDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => {
        try {
          return [JSON.parse(readFileSync(join(this.localDir, f), 'utf-8')) as AgentTemplate];
        } catch {
          return [];
        }
      });
  }

  private saveLocal(template: AgentTemplate): void {
    mkdirSync(this.localDir, { recursive: true });
    writeFileSync(
      this.localTemplatePath(template.id),
      JSON.stringify(template, null, 2),
      'utf-8',
    );
  }

  private localTemplatePath(id: string): string {
    return join(this.localDir, `${id}.json`);
  }
}
