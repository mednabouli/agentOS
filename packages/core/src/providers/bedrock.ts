import type { ModelProvider, ProviderCredentials, ProviderRequest, ProviderResponse } from './types.js';

export class BedrockProvider implements ModelProvider {
  private readonly region: string;
  private readonly creds: ProviderCredentials;

  constructor(creds: ProviderCredentials = {}) {
    this.region =
      creds.awsRegion ??
      process.env['AWS_REGION'] ??
      process.env['AWS_DEFAULT_REGION'] ??
      'us-east-1';
    this.creds = creds;
  }

  async complete(req: ProviderRequest): Promise<ProviderResponse> {
    // Dynamic import keeps the optional dep from crashing if not installed
    const { BedrockRuntimeClient, ConverseCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    ).catch(() => {
      throw new Error(
        'AWS SDK not installed. Run: pnpm add @aws-sdk/client-bedrock-runtime',
      );
    });

    const clientConfig: Record<string, unknown> = { region: this.region };
    const accessKeyId =
      this.creds.awsAccessKeyId ?? process.env['AWS_ACCESS_KEY_ID'];
    const secretAccessKey =
      this.creds.awsSecretAccessKey ?? process.env['AWS_SECRET_ACCESS_KEY'];
    const sessionToken =
      this.creds.awsSessionToken ?? process.env['AWS_SESSION_TOKEN'];

    if (accessKeyId !== undefined && secretAccessKey !== undefined) {
      clientConfig['credentials'] = {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken !== undefined ? { sessionToken } : {}),
      };
    }

    const client = new BedrockRuntimeClient(clientConfig);

    const additionalFields: Record<string, unknown> = {};
    if (req.thinkingBudget > 0) {
      additionalFields['thinking'] = {
        type: 'enabled',
        budget_tokens: req.thinkingBudget,
      };
    }

    const command = new ConverseCommand({
      modelId: req.model,
      system: [{ text: req.systemPrompt }],
      messages: [{ role: 'user', content: [{ text: req.userMessage }] }],
      inferenceConfig: { maxTokens: req.maxTokens },
      ...(Object.keys(additionalFields).length > 0
        ? { additionalModelRequestFields: additionalFields }
        : {}),
    });

    const response = await client.send(command);
    const blocks = response.output?.message?.content ?? [];
    const text = ((blocks as unknown) as Array<Record<string, unknown>>)
      .filter((b) => typeof b['text'] === 'string')
      .map((b) => b['text'] as string)
      .join('\n');

    const usage = (response.usage ?? {}) as Record<string, number>;

    return {
      text,
      inputTokens: usage['inputTokens'] ?? 0,
      outputTokens: usage['outputTokens'] ?? 0,
      thinkingTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
  }
}
