export type ProviderType = 'anthropic' | 'bedrock' | 'azure-openai';

export interface ProviderCredentials {
  // Anthropic direct
  apiKey?: string | undefined;
  // AWS Bedrock
  awsRegion?: string | undefined;
  awsAccessKeyId?: string | undefined;
  awsSecretAccessKey?: string | undefined;
  awsSessionToken?: string | undefined;
  // Azure OpenAI
  azureEndpoint?: string | undefined;
  azureApiKey?: string | undefined;
  azureApiVersion?: string | undefined;
}

export interface ProviderRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  thinkingBudget: number;
  maxTokens: number;
}

export interface ProviderResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ModelProvider {
  complete(request: ProviderRequest): Promise<ProviderResponse>;
}
