import Anthropic from '@anthropic-ai/sdk';
import type { ModelProvider, ProviderRequest, ProviderResponse } from './types.js';

export class AnthropicProvider implements ModelProvider {
  private readonly client: Anthropic;

  constructor(apiKey?: string | undefined) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'] });
  }

  async complete(req: ProviderRequest): Promise<ProviderResponse> {
    const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userMessage }],
    };

    if (req.thinkingBudget > 0) {
      (params as Record<string, unknown>)['thinking'] = {
        type: 'enabled',
        budget_tokens: req.thinkingBudget,
      };
    }

    const response = await this.client.messages.create(params);
    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      thinkingTokens: 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
    };
  }
}
