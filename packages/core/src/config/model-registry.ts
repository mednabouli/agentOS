import type { AgentRole } from '../types/index.js';

export interface ModelConfig {
  model: string;
  thinkingBudget: number;
  /** Input cost per million tokens in USD */
  inputCostPerMillion: number;
  /** Output cost per million tokens in USD */
  outputCostPerMillion: number;
}

const REGISTRY: Record<AgentRole, ModelConfig> = {
  orchestrator: {
    model: 'claude-opus-4-5',
    thinkingBudget: 63_999,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 75.0,
  },
  planner: {
    model: 'claude-sonnet-4-5',
    thinkingBudget: 16_000,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
  },
  developer: {
    model: 'claude-sonnet-4-5',
    thinkingBudget: 16_000,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
  },
  tester: {
    model: 'claude-haiku-4-5',
    thinkingBudget: 4_000,
    inputCostPerMillion: 0.25,
    outputCostPerMillion: 1.25,
  },
  reviewer: {
    model: 'claude-haiku-4-5',
    thinkingBudget: 0,
    inputCostPerMillion: 0.25,
    outputCostPerMillion: 1.25,
  },
  debugger: {
    model: 'claude-sonnet-4-5',
    thinkingBudget: 32_000,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
  },
};

export function getModelConfig(role: AgentRole): ModelConfig {
  const config = REGISTRY[role];
  return config;
}

export function calculateCost(
  role: AgentRole,
  inputTokens: number,
  outputTokens: number,
): number {
  const config = getModelConfig(role);
  const inputCost = (inputTokens / 1_000_000) * config.inputCostPerMillion;
  const outputCost = (outputTokens / 1_000_000) * config.outputCostPerMillion;
  return inputCost + outputCost;
}

export { REGISTRY as MODEL_REGISTRY };
