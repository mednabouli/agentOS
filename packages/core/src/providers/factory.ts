import type { ProviderType, ProviderCredentials, ModelProvider } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { BedrockProvider } from './bedrock.js';
import { AzureOpenAIProvider } from './azure-openai.js';

export function createProvider(
  type: ProviderType,
  creds: ProviderCredentials = {},
): ModelProvider {
  switch (type) {
    case 'anthropic':
      return new AnthropicProvider(creds.apiKey);
    case 'bedrock':
      return new BedrockProvider(creds);
    case 'azure-openai':
      return new AzureOpenAIProvider(creds);
  }
}
