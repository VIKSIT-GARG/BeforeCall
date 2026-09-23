import type { z } from 'zod';
import type { LLMProvider, LLMCallOptions } from './types';
import { MAX_RETRIES } from './types';
import { parseAndValidate, buildRepairPrompt } from '../validation';
import { OllamaProvider } from './ollama';

// NVIDIA is OpenAI-compatible: https://integrate.api.nvidia.com/v1/chat/completions
const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'deepseek-ai/deepseek-v4.1-flash';

import fs from 'fs';

// Circuit breaker to avoid waiting on hanging or unresponsive cloud endpoints
interface CircuitBreaker {
  failures: number;
  openUntil: number;
}
const circuit: CircuitBreaker = {
  failures: 0,
  openUntil: 0,
};

const CIRCUIT_FILE = '/tmp/mp_nvidia_circuit.json';

function getStoredOpenUntil(): number {
  try {
    if (fs.existsSync(CIRCUIT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CIRCUIT_FILE, 'utf-8'));
      return typeof data?.openUntil === 'number' ? data.openUntil : 0;
    }
  } catch {}
  return 0;
}

function setStoredOpenUntil(ts: number) {
  try {
    fs.writeFileSync(CIRCUIT_FILE, JSON.stringify({ openUntil: ts }));
  } catch {}
}

function isCircuitOpen(): boolean {
  const now = Date.now();
  if (now < circuit.openUntil) return true;
  const stored = getStoredOpenUntil();
  if (now < stored) {
    circuit.openUntil = stored;
    return true;
  }
  return false;
}

function tripCircuit(reason: string) {
  circuit.failures++;
  const until = Date.now() + 180_000; // Open for 3 minutes
  circuit.openUntil = until;
  setStoredOpenUntil(until);
  console.warn(`[NvidiaProvider] Circuit breaker tripped (180s) due to: ${reason} -> routing to Ollama`);
}

function recordSuccess() {
  circuit.failures = 0;
  circuit.openUntil = 0;
  setStoredOpenUntil(0);
}

function resolveEnv(name: string, fallback?: string): string | undefined {
  return (process.env[name] ?? fallback)?.trim() || undefined;
}

export class NvidiaProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.apiKey =
      opts?.apiKey ??
      resolveEnv('NVIDIA_API_KEY') ??
      resolveEnv('PRODUCTION_LLM_API_KEY') ??
      resolveEnv('OPENAI_API_KEY') ??
      '';
    this.baseUrl =
      opts?.baseUrl ??
      resolveEnv('NVIDIA_BASE_URL') ??
      resolveEnv('PRODUCTION_LLM_BASE_URL') ??
      resolveEnv('OPENAI_BASE_URL') ??
      DEFAULT_BASE_URL;
    this.model =
      opts?.model ??
      resolveEnv('NVIDIA_MODEL') ??
      resolveEnv('PRODUCTION_LLM_MODEL') ??
      resolveEnv('OPENAI_MODEL') ??
      DEFAULT_MODEL;
    if (!this.apiKey) {
      console.warn('[NvidiaProvider] Missing NVIDIA_API_KEY / PRODUCTION_LLM_API_KEY — requests will fail');
    }
  }

  private async callChatCompletions(
    messages: Array<{ role: string; content: string }>,
    temperature: number,
    opts: { jsonMode?: boolean; stream?: boolean; timeoutMs?: number; maxTokens?: number }
  ): Promise<string | null> {
    if (!this.apiKey) return null;
    const timeoutMs = opts.timeoutMs ?? 6000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();

    try {
      const body: Record<string, unknown> = {
        model: this.model,
        messages,
        temperature,
        stream: !!opts.stream,
      };
      if (opts.jsonMode) body.response_format = { type: 'json_object' };
      if (opts.maxTokens) body.max_tokens = opts.maxTokens;

      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err: any = new Error(`NVIDIA ${res.status}: ${text.slice(0, 500)}`);
        err.status = res.status;
        err.retryAfter = res.headers.get('retry-after');
        throw err;
      }

      if (opts.stream) {
        return null;
      }

      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string | null; reasoning_content?: string | null } }>; usage?: any };
      const msg = json.choices?.[0]?.message;
      const content = msg?.content ?? msg?.reasoning_content ?? null;
      const latency = Date.now() - started;
      console.info(`[llm] provider=nvidia model=${this.model} operation=chat latency_ms=${latency} status=success tokens_in=${json.usage?.prompt_tokens ?? '?'} tokens_out=${json.usage?.completion_tokens ?? '?'}`);
      recordSuccess();
      return content;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateJSON<T>(prompt: string, schema: z.ZodSchema<T>, options?: LLMCallOptions): Promise<T | null> {
    // If circuit is open, immediately delegate to Ollama without blocking
    if (isCircuitOpen()) {
      try {
        const ollama = new OllamaProvider();
        return await ollama.generateJSON(prompt, schema, options);
      } catch (e: any) {
        console.warn('[NvidiaProvider] Ollama fallback failed:', e.message);
        return null;
      }
    }

    const systemPrompt = options?.systemPrompt;
    const temperature = options?.temperature ?? 0.2;
    let currentPrompt = prompt;
    let lastRaw = '';

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const timeoutMs = attempt === 0 ? 6000 : 8000;
      try {
        const messages: Array<{ role: string; content: string }> = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        const userContent = attempt === 0 ? `${currentPrompt}\n\nRespond ONLY with valid JSON matching the requested schema.` : currentPrompt;
        messages.push({ role: 'user', content: userContent });
        const raw = await this.callChatCompletions(messages, temperature, { jsonMode: true, timeoutMs, maxTokens: 1800 });
        if (!raw) {
          if (attempt < MAX_RETRIES - 1) continue;
          break;
        }
        lastRaw = raw;
        const result = parseAndValidate(raw, schema);
        if (result.success) return result.data;
        if (attempt < MAX_RETRIES - 1) {
          currentPrompt = buildRepairPrompt(prompt, raw, result.error);
          continue;
        }
        console.warn('[NvidiaProvider] generateJSON validation failed after retries:', result.error);
        break;
      } catch (error: any) {
        const status = error?.status;
        const is429 = status === 429;
        const is5xx = status >= 500 && status < 600;
        const retryAfter = error?.retryAfter ? parseInt(error.retryAfter, 10) * 1000 : 0;
        console.warn(`[llm] provider=nvidia operation=generateJSON attempt=${attempt + 1} status=${status ?? 'error'} error=${error.message?.slice(0, 150)}`);
        
        if (is429 && attempt < MAX_RETRIES - 1) {
          const backoff = retryAfter || 1000 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, Math.min(backoff, 2000)));
          continue;
        }
        if (is5xx && attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        // If aborted or connection failed, trip the circuit breaker immediately
        tripCircuit(error.message || 'connection timeout');
        break;
      }
    }

    // Graceful degradation: fallback to local Ollama if available
    try {
      const ollama = new OllamaProvider();
      const res = await ollama.generateJSON(prompt, schema, options);
      if (res) {
        console.info('[NvidiaProvider] Degraded to local Ollama fallback successfully');
        return res;
      }
    } catch {}

    return null;
  }

  async generateText(prompt: string, options?: LLMCallOptions): Promise<string | null> {
    if (isCircuitOpen()) {
      try {
        const ollama = new OllamaProvider();
        return await ollama.generateText(prompt, options);
      } catch (e: any) {
        return null;
      }
    }

    const systemPrompt = options?.systemPrompt;
    const temperature = options?.temperature ?? 0.4;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const timeoutMs = attempt === 0 ? 6000 : 8000;
      try {
        const messages: Array<{ role: string; content: string }> = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const raw = await this.callChatCompletions(messages, temperature, { timeoutMs, maxTokens: 600 });
        const text = raw?.trim() ?? null;
        if (text) {
          console.info(`[llm] provider=nvidia operation=generateText status=success`);
          return text;
        }
        if (attempt < MAX_RETRIES - 1) continue;
        break;
      } catch (error: any) {
        tripCircuit(error.message || 'generateText timeout');
        break;
      }
    }

    // Fallback to local Ollama
    try {
      const ollama = new OllamaProvider();
      const res = await ollama.generateText(prompt, options);
      if (res) {
        console.info('[NvidiaProvider] Degraded to local Ollama text successfully');
        return res;
      }
    } catch {}

    return null;
  }

  async *generateTextStream(prompt: string, options?: LLMCallOptions): AsyncGenerator<string, void, unknown> {
    if (isCircuitOpen()) {
      try {
        const ollama = new OllamaProvider();
        for await (const chunk of ollama.generateTextStream(prompt, options)) {
          yield chunk;
        }
      } catch (ollamaErr: any) {
        console.error('[NvidiaProvider] Ollama stream error:', ollamaErr.message);
      }
      return;
    }

    const systemPrompt = options?.systemPrompt;
    const temperature = options?.temperature ?? 0.4;
    let yieldedAny = false;

    if (this.apiKey) {
      const controller = new AbortController();
      // TTFB timeout: if no first token within 4 seconds, abort and cut over to Ollama
      let firstTokenReceived = false;
      const ttfbTimer = setTimeout(() => {
        if (!firstTokenReceived) {
          tripCircuit('TTFB timeout > 4s');
          controller.abort();
        }
      }, 4000);

      const started = Date.now();
      let firstTokenAt: number | null = null;
      try {
        const messages: Array<{ role: string; content: string }> = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({ model: this.model, messages, temperature, stream: true, max_tokens: 700 }),
          signal: controller.signal,
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (!trimmed.startsWith('data:')) continue;
                const data = trimmed.slice(5).trim();
                if (!data) continue;
                try {
                  const json = JSON.parse(data);
                  const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
                  if (delta) {
                    if (firstTokenAt === null) {
                      firstTokenAt = Date.now();
                      firstTokenReceived = true;
                      clearTimeout(ttfbTimer);
                    }
                    yieldedAny = true;
                    yield delta;
                  }
                } catch {}
              }
            }
          } finally {
            reader.releaseLock();
          }
          const total = Date.now() - started;
          console.info(`[llm] provider=nvidia operation=stream latency_ms=${total} ttfb_ms=${firstTokenAt ? firstTokenAt - started : '?'} status=success`);
          recordSuccess();
          return;
        } else {
          tripCircuit(`HTTP ${res.status}`);
        }
      } catch (e: any) {
        console.warn('[NvidiaProvider] Stream error, trying Ollama fallback:', e.message);
        tripCircuit(e.message || 'stream failed');
      } finally {
        clearTimeout(ttfbTimer);
      }
    }

    if (!yieldedAny) {
      try {
        const ollama = new OllamaProvider();
        for await (const chunk of ollama.generateTextStream(prompt, options)) {
          yield chunk;
        }
      } catch (ollamaErr: any) {
        console.error('[NvidiaProvider] Ollama fallback stream error:', ollamaErr.message);
      }
    }
  }

  async healthCheck(): Promise<{ provider: string; model: string; status: 'healthy' | 'unhealthy'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      if (!this.apiKey) throw new Error('Missing API key');
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(id);
      if (!res.ok) throw new Error(`models ${res.status}`);
      return { provider: 'nvidia', model: this.model, status: 'healthy', latencyMs: Date.now() - start };
    } catch (e: any) {
      // Check if local Ollama is available
      try {
        const ollama = new OllamaProvider();
        const oCheck = await ollama.healthCheck();
        if (oCheck.status === 'healthy') {
          return { provider: 'ollama (fallback)', model: oCheck.model, status: 'healthy', latencyMs: oCheck.latencyMs };
        }
      } catch {}
      return { provider: 'nvidia', model: this.model, status: 'unhealthy', error: e.message, latencyMs: Date.now() - start };
    }
  }
}

export default NvidiaProvider;
