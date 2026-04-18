import { generateId } from '../utils/id.js';
import type { AgentTemplate } from './types.js';

function id(): string {
  return generateId();
}

export const BUILT_IN_TEMPLATES: AgentTemplate[] = [
  {
    id: 'add-payments',
    name: 'Add Payment Integration',
    description: 'Integrate a payment provider (Stripe, Paddle, etc.) into an existing application.',
    version: '1.0.0',
    author: 'AgentOS',
    tags: ['payments', 'stripe', 'ecommerce', 'backend'],
    variables: [
      { name: 'PAYMENT_PROVIDER', description: 'Payment provider name (e.g. Stripe, Paddle)', required: true },
      { name: 'FEATURE', description: 'What payment feature to add (e.g. checkout, subscriptions)', required: true, default: 'checkout' },
      { name: 'CURRENCY', description: 'Primary currency code (e.g. USD, EUR)', required: false, default: 'USD' },
    ],
    nodes: [
      {
        id: id(), role: 'orchestrator', phase: 'analyze', dependencies: [],
        input: { prompt: 'Analyze the codebase to understand how to integrate {{PAYMENT_PROVIDER}} for {{FEATURE}} in {{CURRENCY}}. Identify existing payment flows, database schema, API routes, and frontend components that will need modification.' },
      },
      {
        id: id(), role: 'planner', phase: 'plan', dependencies: [],
        input: { prompt: 'Create a detailed implementation plan for adding {{PAYMENT_PROVIDER}} {{FEATURE}} supporting {{CURRENCY}}. Include: webhook handlers, database migrations for payment records, API route design, frontend checkout flow, error handling, and idempotency keys.' },
      },
      {
        id: id(), role: 'developer', phase: 'implement', dependencies: [],
        input: { prompt: 'Implement {{PAYMENT_PROVIDER}} {{FEATURE}} integration. Create payment service, webhook handler, database models for transactions, API routes, and frontend components. Use {{CURRENCY}} as the primary currency. Follow the implementation plan exactly.' },
      },
      {
        id: id(), role: 'tester', phase: 'test', dependencies: [],
        input: { prompt: 'Write comprehensive tests for the {{PAYMENT_PROVIDER}} {{FEATURE}} integration: unit tests for the payment service, integration tests for webhook processing, and E2E tests for the {{CURRENCY}} checkout flow.' },
      },
      {
        id: id(), role: 'reviewer', phase: 'review', dependencies: [],
        input: { prompt: 'Review the {{PAYMENT_PROVIDER}} integration for security vulnerabilities (webhook signature validation, idempotency, PCI compliance considerations), error handling completeness, and test coverage gaps.' },
      },
    ],
  },

  {
    id: 'add-auth',
    name: 'Add Authentication System',
    description: 'Add a complete authentication system (signup, login, sessions, password reset).',
    version: '1.0.0',
    author: 'AgentOS',
    tags: ['auth', 'security', 'users', 'sessions'],
    variables: [
      { name: 'AUTH_STRATEGY', description: 'Auth strategy: jwt, session-cookie, oauth', required: true, default: 'jwt' },
      { name: 'PROVIDERS', description: 'Login providers (e.g. email, github, google)', required: false, default: 'email' },
    ],
    nodes: [
      {
        id: id(), role: 'orchestrator', phase: 'analyze', dependencies: [],
        input: { prompt: 'Analyze the codebase for adding {{AUTH_STRATEGY}} authentication with {{PROVIDERS}} providers. Identify: existing user model if any, session handling, protected routes, and frontend auth state management.' },
      },
      {
        id: id(), role: 'planner', phase: 'plan', dependencies: [],
        input: { prompt: 'Plan a complete {{AUTH_STRATEGY}} auth system supporting {{PROVIDERS}}. Cover: user registration/login/logout, password hashing, token refresh, protected route middleware, password reset flow, and {{PROVIDERS}} OAuth if applicable.' },
      },
      {
        id: id(), role: 'developer', phase: 'implement', dependencies: [],
        input: { prompt: 'Implement the full {{AUTH_STRATEGY}} authentication system with {{PROVIDERS}} support. Include auth middleware, user service, token management, and all auth-related API routes and UI components.' },
      },
      {
        id: id(), role: 'tester', phase: 'test', dependencies: [],
        input: { prompt: 'Write security-focused tests for the {{AUTH_STRATEGY}} auth system: token expiry, refresh rotation, brute-force protection, CSRF prevention, and all {{PROVIDERS}} login flows.' },
      },
      {
        id: id(), role: 'reviewer', phase: 'review', dependencies: [],
        input: { prompt: 'Security review the auth implementation: check for timing attacks, insecure token storage, missing rate limiting, improper secret handling, and OWASP auth vulnerabilities.' },
      },
    ],
  },

  {
    id: 'rest-api',
    name: 'Build REST API',
    description: 'Scaffold a full REST API with CRUD endpoints, validation, and OpenAPI docs.',
    version: '1.0.0',
    author: 'AgentOS',
    tags: ['api', 'rest', 'backend', 'crud'],
    variables: [
      { name: 'RESOURCE', description: 'Primary resource name (e.g. products, orders, users)', required: true },
      { name: 'FIELDS', description: 'Comma-separated field names (e.g. name,price,sku)', required: true },
      { name: 'AUTH_REQUIRED', description: 'Require authentication: yes or no', required: false, default: 'yes' },
    ],
    nodes: [
      {
        id: id(), role: 'orchestrator', phase: 'analyze', dependencies: [],
        input: { prompt: 'Analyze codebase conventions for adding a REST API for the {{RESOURCE}} resource with fields: {{FIELDS}}. Identify existing patterns, database ORM, validation library, and error response format.' },
      },
      {
        id: id(), role: 'planner', phase: 'plan', dependencies: [],
        input: { prompt: 'Design REST API for {{RESOURCE}} (fields: {{FIELDS}}, auth required: {{AUTH_REQUIRED}}). Plan: database schema, repository layer, service layer, route handlers, request validation schemas, pagination, filtering, sorting, and OpenAPI spec.' },
      },
      {
        id: id(), role: 'developer', phase: 'implement', dependencies: [],
        input: { prompt: 'Implement the complete {{RESOURCE}} REST API (fields: {{FIELDS}}, auth: {{AUTH_REQUIRED}}): database migration, model, repository, service, routes (GET list/show, POST, PATCH, DELETE), validation middleware, and OpenAPI annotations.' },
      },
      {
        id: id(), role: 'tester', phase: 'test', dependencies: [],
        input: { prompt: 'Write integration tests for all {{RESOURCE}} endpoints: CRUD operations, validation error responses, pagination, filtering, {{AUTH_REQUIRED}} auth enforcement, and edge cases (not found, duplicate, etc.).' },
      },
      {
        id: id(), role: 'reviewer', phase: 'review', dependencies: [],
        input: { prompt: 'Review the {{RESOURCE}} API for: N+1 query issues, missing input sanitization, improper HTTP status codes, missing pagination limits, and incomplete OpenAPI documentation.' },
      },
    ],
  },

  {
    id: 'react-component',
    name: 'Build React Component',
    description: 'Create a polished, accessible, and tested React component.',
    version: '1.0.0',
    author: 'AgentOS',
    tags: ['react', 'frontend', 'ui', 'component'],
    variables: [
      { name: 'COMPONENT_NAME', description: 'PascalCase component name (e.g. DataTable, PricingCard)', required: true },
      { name: 'DESCRIPTION', description: 'What the component does', required: true },
      { name: 'PROPS', description: 'Key props the component accepts', required: false, default: 'standard props' },
    ],
    nodes: [
      {
        id: id(), role: 'orchestrator', phase: 'analyze', dependencies: [],
        input: { prompt: 'Analyze the existing design system, component patterns, styling approach, and accessibility practices in the codebase to inform building {{COMPONENT_NAME}}: {{DESCRIPTION}}.' },
      },
      {
        id: id(), role: 'planner', phase: 'plan', dependencies: [],
        input: { prompt: 'Plan {{COMPONENT_NAME}} ({{DESCRIPTION}}) with props: {{PROPS}}. Design the component API, internal state, composition, accessibility (ARIA), keyboard navigation, responsive behavior, and story/test plan.' },
      },
      {
        id: id(), role: 'developer', phase: 'implement', dependencies: [],
        input: { prompt: 'Implement {{COMPONENT_NAME}} ({{DESCRIPTION}}) accepting {{PROPS}}. Build with full accessibility (ARIA labels, keyboard nav, focus management), responsive design, proper TypeScript types, and Storybook story if the project uses Storybook.' },
      },
      {
        id: id(), role: 'tester', phase: 'test', dependencies: [],
        input: { prompt: 'Write tests for {{COMPONENT_NAME}}: renders correctly with all prop variants, keyboard navigation, ARIA attributes, interaction events, and visual regression test if applicable.' },
      },
      {
        id: id(), role: 'reviewer', phase: 'review', dependencies: [],
        input: { prompt: 'Review {{COMPONENT_NAME}} for: accessibility compliance (WCAG 2.1 AA), missing prop validations, performance (unnecessary re-renders, missing memo), and missing edge-case handling.' },
      },
    ],
  },

  {
    id: 'bug-fix',
    name: 'Systematic Bug Fix',
    description: 'Investigate a bug, identify root cause, implement fix, and add regression tests.',
    version: '1.0.0',
    author: 'AgentOS',
    tags: ['bug', 'debugging', 'fix', 'regression'],
    variables: [
      { name: 'BUG_DESCRIPTION', description: 'Describe the bug — what happens vs. what is expected', required: true },
      { name: 'AFFECTED_AREA', description: 'Which area of the codebase is affected (e.g. auth, checkout, API)', required: false, default: 'unknown' },
    ],
    nodes: [
      {
        id: id(), role: 'orchestrator', phase: 'analyze', dependencies: [],
        input: { prompt: 'Investigate this bug in the {{AFFECTED_AREA}} area: {{BUG_DESCRIPTION}}. Trace the execution path, identify the root cause, and list all files that may be involved. Do not fix yet — analysis only.' },
      },
      {
        id: id(), role: 'debugger', phase: 'plan', dependencies: [],
        input: { prompt: 'Given the analysis of the {{AFFECTED_AREA}} bug ({{BUG_DESCRIPTION}}), design the minimal fix that addresses the root cause without introducing regressions. Describe the exact changes needed and their rationale.' },
      },
      {
        id: id(), role: 'developer', phase: 'implement', dependencies: [],
        input: { prompt: 'Implement the fix for the {{AFFECTED_AREA}} bug: {{BUG_DESCRIPTION}}. Apply only the minimal changes identified in the plan. Add a regression test that would have caught this bug.' },
      },
      {
        id: id(), role: 'tester', phase: 'test', dependencies: [],
        input: { prompt: 'Write a focused regression test suite for the {{AFFECTED_AREA}} bug ({{BUG_DESCRIPTION}}): a test that reproduces the original bug (should now pass), boundary cases, and related edge cases that might share the same root cause.' },
      },
      {
        id: id(), role: 'reviewer', phase: 'review', dependencies: [],
        input: { prompt: 'Review the bug fix for {{AFFECTED_AREA}} ({{BUG_DESCRIPTION}}): verify the fix is complete, check for related code paths with the same bug pattern, confirm the regression test actually catches the original issue.' },
      },
    ],
  },
];
