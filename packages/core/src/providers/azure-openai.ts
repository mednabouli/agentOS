import type { ModelProvider, ProviderCredentials, ProviderRequest, ProviderResponse } from './types.js';

export class AzureOpenAIProvider implements ModelProvider {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly apiVersion: string;

  constructor(creds: ProviderCredentials = {}) {
    const endpoint = creds.azureEndpoint ?? process.env['AZURE_OPENAI_ENDPOINT'] ?? '';
    const apiKey = creds.azureApiKey ?? process.env['AZURE_OPENAI_API_KEY'] ?? '';

    if (endpoint.length === 0) {
      throw new Error(
        'Azure OpenAI endpoint not configured. Set AZURE_OPENAI_ENDPOINT or routing.json credentials.azureEndpoint.',
      );
    }
    if (apiKey.length === 0) {
      throw new Error(
        'Azure OpenAI API key not configured. Set AZURE_OPENAI_API_KEY or routing.json credentials.azureApiKey.',
      );
    }

    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.apiVersion =
      creds.azureApiVersion ??
      process.env['AZURE_OPENAI_API_VERSION'] ??
      '2024-10-21';
  }

  async complete(req: ProviderRequest): Promise<ProviderResponse> {
    const { AzureOpenAI } = await import('openai').catch(() => {
      throw new Error('openai package not installed. Run: pnpm add openai');
    });

    const client = new AzureOpenAI({
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      apiVersion: this.apiVersion,
    });

    const response = await client.chat.completions.create({
      model: req.model,
      max_tokens: req.maxTokens,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userMessage },
      ],
    });

    const text = response.choices
      .map((c) => c.message.content ?? '')
      .join('\n');

    return {
      text,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      thinkingTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
  }
}
