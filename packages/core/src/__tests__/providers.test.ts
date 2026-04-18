import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProvider } from '../providers/factory.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { loadRoutingConfig, resolveRoute } from '../config/routing.js';
import type { RoutingConfig } from '../config/routing.js';

// ── AnthropicProvider ────────────────────────────────────────────────────────

vi.mock('@anthropic-ai/sdk', () => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Hello from mock' }],
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 10,
      cache_creation_input_tokens: 0,
    },
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create },
    })),
  };
});

describe('AnthropicProvider', () => {
  it('returns normalized ProviderResponse', async () => {
    const provider = new AnthropicProvider('sk-test');
    const resp = await provider.complete({
      model: 'claude-sonnet-4-5',
      systemPrompt: 'You are helpful.',
      userMessage: 'Say hi.',
      thinkingBudget: 0,
      maxTokens: 1024,
    });
    expect(resp.text).toBe('Hello from mock');
    expect(resp.inputTokens).toBe(100);
    expect(resp.outputTokens).toBe(50);
    expect(resp.cacheReadTokens).toBe(10);
  });

  it('includes thinking param when thinkingBudget > 0', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const mockCreate = vi.mocked(
      (Anthropic as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value.messages.create,
    );

    const provider = new AnthropicProvider('sk-test');
    await provider.complete({
      model: 'claude-opus-4-5',
      systemPrompt: 'sys',
      userMessage: 'think',
      thinkingBudget: 16_000,
      maxTokens: 8192,
    });

    const call = mockCreate?.mock.calls[mockCreate.mock.calls.length - 1]?.[0] as Record<string, unknown>;
    expect(call?.['thinking']).toEqual({ type: 'enabled', budget_tokens: 16_000 });
  });
});

// ── createProvider factory ───────────────────────────────────────────────────

describe('createProvider', () => {
  it('returns AnthropicProvider for anthropic type', () => {
    const p = createProvider('anthropic', { apiKey: 'sk-test' });
    expect(p).toBeInstanceOf(AnthropicProvider);
  });

  it('returns BedrockProvider for bedrock type', async () => {
    const { BedrockProvider } = await import('../providers/bedrock.js');
    const p = createProvider('bedrock', { awsRegion: 'us-east-1' });
    expect(p).toBeInstanceOf(BedrockProvider);
  });

  it('throws for AzureOpenAIProvider when endpoint missing', () => {
    delete process.env['AZURE_OPENAI_ENDPOINT'];
    delete process.env['AZURE_OPENAI_API_KEY'];
    expect(() => createProvider('azure-openai', {})).toThrow(/endpoint not configured/);
  });

  it('constructs AzureOpenAIProvider when credentials provided', async () => {
    const { AzureOpenAIProvider } = await import('../providers/azure-openai.js');
    const p = createProvider('azure-openai', {
      azureEndpoint: 'https://test.openai.azure.com/',
      azureApiKey: 'az-key',
    });
    expect(p).toBeInstanceOf(AzureOpenAIProvider);
  });
});

// ── loadRoutingConfig ────────────────────────────────────────────────────────

describe('loadRoutingConfig', () => {
  beforeEach(() => {
    for (const key of Object.keys(process.env).filter((k) => k.startsWith('AGENTOS_ROUTE_'))) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of Object.keys(process.env).filter((k) => k.startsWith('AGENTOS_ROUTE_'))) {
      delete process.env[key];
    }
  });

  it('returns empty config when no env vars or file', () => {
    const cfg = loadRoutingConfig('/nonexistent/path');
    expect(cfg).toEqual({});
  });

  it('parses AGENTOS_ROUTE_ORCHESTRATOR env var', () => {
    process.env['AGENTOS_ROUTE_ORCHESTRATOR'] = 'bedrock:anthropic.claude-opus-4-5';
    const cfg = loadRoutingConfig('/nonexistent/path');
    expect(cfg['orchestrator']).toEqual({ provider: 'bedrock', model: 'anthropic.claude-opus-4-5' });
  });

  it('handles provider-only env var (no model)', () => {
    process.env['AGENTOS_ROUTE_DEVELOPER'] = 'azure-openai';
    const cfg = loadRoutingConfig('/nonexistent/path');
    expect(cfg['developer']).toEqual({ provider: 'azure-openai' });
  });
});

// ── resolveRoute ─────────────────────────────────────────────────────────────

describe('resolveRoute', () => {
  it('defaults to anthropic with no routing config', () => {
    const result = resolveRoute('orchestrator', {});
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBeUndefined();
  });

  it('uses routing config when present', () => {
    const routing: RoutingConfig = {
      orchestrator: { provider: 'bedrock', model: 'anthropic.claude-opus-4-5' },
    };
    const result = resolveRoute('orchestrator', routing);
    expect(result.provider).toBe('bedrock');
    expect(result.model).toBe('anthropic.claude-opus-4-5');
  });

  it('falls back to anthropic for unrouted role', () => {
    const routing: RoutingConfig = {
      orchestrator: { provider: 'bedrock', model: 'claude-opus' },
    };
    const result = resolveRoute('developer', routing);
    expect(result.provider).toBe('anthropic');
  });
});
