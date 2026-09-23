import type { LLMProvider, ProviderName } from './types';
import { NvidiaProvider } from './nvidia';
import { OllamaProvider } from './ollama';
import { MockProvider } from './mock';

let cachedProvider: LLMProvider | null = null;
let cachedName: ProviderName | null = null;

export function getProviderName(): ProviderName {
  const raw = (process.env.LLM_PROVIDER ?? '').toLowerCase().trim();
  const hasNvidiaKey = !!(process.env.NVIDIA_API_KEY || process.env.PRODUCTION_LLM_API_KEY || process.env.OPENAI_API_KEY);
  if (raw === 'mock') return 'mock';
  if (raw === 'ollama') return 'ollama';
  if (raw === 'production' || raw === 'prod' || raw === 'nvidia') {
    return 'production';
  }
  if (hasNvidiaKey) return 'production';
  return 'ollama';
}

export function getLLMProvider(): LLMProvider {
  const name = getProviderName();
  if (cachedProvider && cachedName === name) return cachedProvider;

  let provider: LLMProvider;
  switch (name) {
    case 'production':
      provider = new NvidiaProvider();
      break;
    case 'ollama':
      provider = new OllamaProvider();
      break;
    case 'mock':
      provider = new MockProvider();
      break;
    default:
      provider = new NvidiaProvider();
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
export { NvidiaProvider } from './nvidia';
export { OllamaProvider } from './ollama';
export { MockProvider } from './mock';
