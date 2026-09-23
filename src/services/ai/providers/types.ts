import type { z } from 'zod';

export interface LLMCallOptions {
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMProvider {
  /**
   * Generate structured JSON and validate against Zod schema.
   * On validation/parse failure, implementor should retry with repair prompt up to 3 times,
   * then return null (graceful failure, never throw for validation).
   */
  generateJSON<T>(prompt: string, schema: z.ZodSchema<T>, options?: LLMCallOptions): Promise<T | null>;

  /**
   * Generate plain text. Returns null on failure.
   */
  generateText(prompt: string, options?: LLMCallOptions): Promise<string | null>;

  /**
   * Streaming text generation — yields tokens as they arrive.
   * Optional; if not implemented, caller should fallback to generateText.
   */
  generateTextStream?(prompt: string, options?: LLMCallOptions): AsyncGenerator<string, void, unknown>;
}

export const RESEARCH_CONTEXT_MAX_CHARS = 5000;
export const MAX_RESULTS_PER_CALL = 10;
export const MAX_RETRIES = 2; // bounded: 0-1 retry for transient, per spec latency-first
export const TEMPERATURE_FACTUAL = 0.2;
export const TEMPERATURE_CREATIVE = 0.4;

export type ProviderName = 'production' | 'ollama' | 'mock';
