import { Ollama } from 'ollama';
import type { z } from 'zod';
import type { LLMProvider, LLMCallOptions } from './types';
import { MAX_RETRIES } from './types';
import { parseAndValidate, buildRepairPrompt } from '../validation';

export class OllamaProvider implements LLMProvider {
  private ollama: Ollama;
  private model: string;

  constructor(opts?: { host?: string; model?: string; client?: Ollama }) {
    const host = opts?.host ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.model = opts?.model ?? process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:7b';
    this.ollama = opts?.client ?? new Ollama({ host });
  }

  async generateJSON<T>(prompt: string, schema: z.ZodSchema<T>, options?: LLMCallOptions): Promise<T | null> {
    const systemPrompt = options?.systemPrompt;
    const temperature = options?.temperature ?? 0.2;

    let currentPrompt = prompt;
    let lastRaw = '';

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.ollama.generate({
          model: this.model,
          prompt: currentPrompt,
          system: systemPrompt,
          format: 'json',
          options: { temperature, top_p: 0.9 },
        });

        lastRaw = response.response ?? '';
        const result = parseAndValidate(lastRaw, schema);
        if (result.success) return result.data;

        // Validation failed → repair prompt for next attempt
        if (attempt < MAX_RETRIES - 1) {
          currentPrompt = buildRepairPrompt(prompt, lastRaw, result.error);
          continue;
        }
        console.warn('[OllamaProvider] generateJSON validation failed after retries:', result.error);
        return null;
      } catch (error) {
        // Network / ollama error: retry with same prompt (transient)
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[OllamaProvider] generateJSON attempt ${attempt + 1} error:`, msg);
        if (attempt < MAX_RETRIES - 1) {
          // For hard JSON errors, keep retrying; last attempt returns null
          currentPrompt = buildRepairPrompt(prompt, lastRaw || msg, msg);
          continue;
        }
        console.error('[OllamaProvider] generateJSON failed after retries:', error);
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
        const response = await this.ollama.generate({
          model: this.model,
          prompt,
          system: systemPrompt,
          options: { temperature, top_p: 0.9 },
        });
        const text = response.response?.trim();
        if (text) return text;
        if (attempt < MAX_RETRIES - 1) continue;
        return null;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[OllamaProvider] generateText attempt ${attempt + 1} error:`, msg);
        if (attempt >= MAX_RETRIES - 1) {
          console.error('[OllamaProvider] generateText failed after retries:', error);
          return null;
        }
      }
    }
    return null;
  }
}
