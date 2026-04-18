import { describe, it, expect } from 'vitest';
import { PRDParser } from '../prd/index.js';
import { PHASES } from '../config/phases.js';

const SAMPLE_PRD = `# Build Auth System

## Executive Summary
A robust authentication system with JWT and Supabase.

## Features

### User Registration
Allow users to create accounts with email and password.
Validate email format and password strength.
Store credentials securely using Supabase Auth.

### Login Flow
Users log in with email and password.
Return JWT on success. Redirect to dashboard.
`;

describe('PRDParser.parseContent', () => {
  const parser = new PRDParser();

  it('extracts the title', () => {
    const result = parser.parseContent(SAMPLE_PRD);
    expect(result.title).toBe('Build Auth System');
  });

  it('extracts a summary', () => {
    const result = parser.parseContent(SAMPLE_PRD);
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it('generates tasks covering all phases', () => {
    const result = parser.parseContent(SAMPLE_PRD);
    const phases = new Set(result.tasks.map((t) => t.phase));
    for (const phase of PHASES) {
      expect(phases.has(phase)).toBe(true);
    }
  });

  it('assigns correct roles for phases', () => {
    const result = parser.parseContent(SAMPLE_PRD);
    const analyzeTask = result.tasks.find((t) => t.phase === 'analyze');
    const implementTask = result.tasks.find((t) => t.phase === 'implement');
    expect(analyzeTask?.role).toBe('orchestrator');
    expect(implementTask?.role).toBe('developer');
  });

  it('sets up dependencies between phases', () => {
    const result = parser.parseContent(SAMPLE_PRD);
    const planTask = result.tasks.find((t) => t.phase === 'plan');
    expect(planTask?.dependencies.length).toBeGreaterThan(0);
  });
});

describe('PRDParser.parsePrompt', () => {
  const parser = new PRDParser();

  it('builds a 5-node linear DAG', () => {
    const result = parser.parsePrompt('Add Stripe payments');
    expect(result.tasks).toHaveLength(5);
  });

  it('each task depends on the previous one', () => {
    const result = parser.parsePrompt('Add Stripe payments');
    for (let i = 1; i < result.tasks.length; i++) {
      const prevId = result.tasks[i - 1]?.id;
      const curr = result.tasks[i];
      expect(curr?.dependencies).toContain(prevId);
    }
  });
});
