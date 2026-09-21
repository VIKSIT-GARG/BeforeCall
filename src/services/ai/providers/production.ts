import type { z } from 'zod';
import type { LLMProvider, LLMCallOptions } from './types';
import { MAX_RETRIES } from './types';
import { parseAndValidate, buildRepairPrompt } from '../validation';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const TIMEOUT_MS = 30_000;

export class ProductionProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.apiKey =
      opts?.apiKey ??
      process.env.PRODUCTION_LLM_API_KEY ??
      process.env.OPENAI_API_KEY ??
      '';
    this.baseUrl =
      opts?.baseUrl ??
      process.env.PRODUCTION_LLM_BASE_URL ??
      process.env.OPENAI_BASE_URL ??
      DEFAULT_BASE_URL;
    this.model =
      opts?.model ??
      process.env.PRODUCTION_LLM_MODEL ??
      process.env.OPENAI_MODEL ??
      'gpt-4o-mini';
  }

  private async callChatCompletions(
    messages: Array<{ role: string; content: string }>,
    temperature: number,
    jsonMode: boolean
  ): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('[ProductionProvider] Missing PRODUCTION_LLM_API_KEY');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const body: Record<string, unknown> = {
        model: this.model,
        messages,
        temperature,
      };
      if (jsonMode) {
        body.response_format = { type: 'json_object' };
      }

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
        throw new Error(`Production LLM ${res.status}: ${text.slice(0, 500)}`);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content ?? null;
      return content;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateJSON<T>(prompt: string, schema: z.ZodSchema<T>, options?: LLMCallOptions): Promise<T | null> {
    const systemPrompt = options?.systemPrompt;
    const temperature = options?.temperature ?? 0.2;

    let currentPrompt = prompt;
    let lastRaw = '';

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const messages: Array<{ role: string; content: string }> = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        // Ensure JSON instruction
        const userContent =
          attempt === 0
            ? `${currentPrompt}\n\nRespond ONLY with valid JSON matching the requested schema.`
            : currentPrompt;
        messages.push({ role: 'user', content: userContent });

        const raw = await this.callChatCompletions(messages, temperature, true);
        if (!raw) {
          if (attempt < MAX_RETRIES - 1) continue;
          return null;
        }
        lastRaw = raw;
        const result = parseAndValidate(raw, schema);
        if (result.success) return result.data;

        if (attempt < MAX_RETRIES - 1) {
          currentPrompt = buildRepairPrompt(prompt, raw, result.error);
          continue;
        }
        console.warn('[ProductionProvider] generateJSON validation failed after retries:', result.error);
        return null;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[ProductionProvider] generateJSON attempt ${attempt + 1} error:`, msg);
        if (attempt < MAX_RETRIES - 1) {
          currentPrompt = buildRepairPrompt(prompt, lastRaw || msg, msg);
          continue;
        }
        console.error('[ProductionProvider] generateJSON failed after retries:', error);
        return null;
      }
    }
    return null;
  }

  async generateText(prompt: string, options?: LLMCallOptions): Promise<string | null> {
    const systemPrompt = options?.systemPrompt;
    const temperature = options?.temperature ?? 0.4;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const messages: Array<{ role: string; content: string }> = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        const raw = await this.callChatCompletions(messages, temperature, false);
        const text = raw?.trim() ?? null;
        if (text) return text;
        if (attempt < MAX_RETRIES - 1) continue;
        return null;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[ProductionProvider] generateText attempt ${attempt + 1} error:`, msg);
        if (attempt >= MAX_RETRIES - 1) {
          console.error('[ProductionProvider] generateText failed after retries:', error);
          return null;
        }
      }
    }
    return null;
  }
}
