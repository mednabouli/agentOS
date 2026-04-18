import { readFileSync } from 'node:fs';
import type { TaskNode, WorkflowPhase, AgentRole } from '../types/index.js';
import { generateId } from '../utils/id.js';
import { logger } from '../utils/logger.js';

export interface ParsedPRD {
  title: string;
  summary: string;
  tasks: TaskNode[];
}

const PHASE_ORDER: WorkflowPhase[] = ['analyze', 'plan', 'implement', 'test', 'review'];

const ROLE_FOR_PHASE: Record<WorkflowPhase, AgentRole> = {
  analyze: 'orchestrator',
  plan: 'planner',
  implement: 'developer',
  test: 'tester',
  review: 'reviewer',
};

export class PRDParser {
  parseFile(prdPath: string): ParsedPRD {
    const content = readFileSync(prdPath, 'utf-8');
    return this.parseContent(content);
  }

  parseContent(markdown: string): ParsedPRD {
    const title = extractTitle(markdown);
    const summary = extractSummary(markdown);
    const featureSections = extractFeatureSections(markdown);

    logger.info('PRDParser: parsing PRD', { title, featureSections: featureSections.length });

    const tasks = featureSections.length > 0
      ? buildTasksFromSections(featureSections)
      : buildDefaultTaskGraph(summary);

    logger.info('PRDParser: generated task DAG', { taskCount: tasks.length });

    return { title, summary, tasks };
  }

  /** Parse a free-form prompt (not a full PRD file) into a minimal task DAG */
  parsePrompt(prompt: string): ParsedPRD {
    return {
      title: prompt.slice(0, 60),
      summary: prompt,
      tasks: buildDefaultTaskGraph(prompt),
    };
  }
}

function extractTitle(markdown: string): string {
  const match = /^#\s+(.+)/m.exec(markdown);
  return match?.[1]?.trim() ?? 'Untitled Task';
}

function extractSummary(markdown: string): string {
  const execSummaryMatch = /##\s+(?:executive summary|summary|overview)\s*\n+([\s\S]+?)(?=\n##|\z)/i.exec(markdown);
  if (execSummaryMatch !== null) {
    return execSummaryMatch[1]?.trim().slice(0, 500) ?? '';
  }

  const lines = markdown.split('\n').filter((l) => l.trim().length > 0 && !l.startsWith('#'));
  return lines.slice(0, 5).join(' ').slice(0, 500);
}

interface FeatureSection {
  title: string;
  content: string;
}

function extractFeatureSections(markdown: string): FeatureSection[] {
  const sections: FeatureSection[] = [];
  const sectionRe = /^##\s+(.+)\n([\s\S]*?)(?=^##|\z)/gm;
  let match: RegExpExecArray | null;

  const SKIP = new Set([
    'executive summary', 'summary', 'overview', 'introduction',
    'background', 'goals', 'non-goals', 'out of scope', 'appendix',
    'pricing', 'monetization', 'go-to-market', 'success metrics',
    'milestones', 'timeline',
  ]);

  while ((match = sectionRe.exec(markdown)) !== null) {
    const title = match[1]?.trim() ?? '';
    const content = match[2]?.trim() ?? '';
    if (!SKIP.has(title.toLowerCase()) && content.length > 20) {
      sections.push({ title, content });
    }
  }

  return sections;
}

function buildTasksFromSections(sections: FeatureSection[]): TaskNode[] {
  const tasks: TaskNode[] = [];
  const prevPhaseIdByPhase = new Map<WorkflowPhase, string>();

  for (const section of sections) {
    let prevTaskId: string | null = null;

    for (const phase of PHASE_ORDER) {
      const id = generateId();
      const dependencies: string[] = [];

      if (prevTaskId !== null) {
        dependencies.push(prevTaskId);
      }

      const crossPhaseDep = prevPhaseIdByPhase.get(phase);
      if (crossPhaseDep !== undefined && !dependencies.includes(crossPhaseDep)) {
        dependencies.push(crossPhaseDep);
      }

      tasks.push({
        id,
        role: ROLE_FOR_PHASE[phase],
        phase,
        input: { prompt: `${section.title}: ${section.content.slice(0, 200)}` },
        dependencies,
      });

      prevTaskId = id;
      prevPhaseIdByPhase.set(phase, id);
    }
  }

  return tasks;
}

function buildDefaultTaskGraph(prompt: string): TaskNode[] {
  const tasks: TaskNode[] = [];
  let prevId: string | null = null;

  for (const phase of PHASE_ORDER) {
    const id = generateId();
    const dependencies = prevId !== null ? [prevId] : [];

    tasks.push({
      id,
      role: ROLE_FOR_PHASE[phase],
      phase,
      input: { prompt },
      dependencies,
    });

    prevId = id;
  }

  return tasks;
}
