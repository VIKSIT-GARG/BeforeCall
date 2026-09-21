import type { LLMProvider, ProviderName } from './types';
import { OllamaProvider } from './ollama';
import { ProductionProvider } from './production';
import { MockProvider } from './mock';

let cachedProvider: LLMProvider | null = null;
let cachedName: ProviderName | null = null;

export function getProviderName(): ProviderName {
  const raw = (process.env.LLM_PROVIDER ?? 'ollama').toLowerCase().trim();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'mock') return 'mock';
  return 'ollama';
}

export function getLLMProvider(): LLMProvider {
  const name = getProviderName();
  if (cachedProvider && cachedName === name) return cachedProvider;

  let provider: LLMProvider;
  switch (name) {
    case 'production':
      provider = new ProductionProvider();
      break;
    case 'mock':
      provider = new MockProvider();
      break;
    case 'ollama':
    default:
      provider = new OllamaProvider();
      break;
  }
  cachedProvider = provider;
  cachedName = name;
  return provider;
}

/** For tests: inject a specific provider instance */
export function setLLMProvider(provider: LLMProvider | null): void {
  cachedProvider = provider;
  cachedName = provider ? getProviderName() : null;
}

/** For tests: clear cache so env change takes effect */
export function resetLLMProvider(): void {
  cachedProvider = null;
  cachedName = null;
}

export type { LLMProvider, LLMCallOptions, ProviderName } from './types';
export { OllamaProvider } from './ollama';
export { ProductionProvider } from './production';
export { MockProvider } from './mock';
