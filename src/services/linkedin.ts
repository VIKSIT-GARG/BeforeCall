/**
 * LinkedIn enrichment stub — ContextOS-inspired provider abstraction.
 * Server-only. No scraping. Normalizes URL and returns placeholder enrichment.
 * Documented for future provider swap (e.g., licensed API).
 *
 * Provider abstraction:
 *  - LinkedinProvider enrich(url) => LinkedinEnrichment | null
 *  - Current impl: StubLinkedinProvider (no network, no scraping)
 *  - Future: ApiLinkedinProvider that calls LINKEDIN_API_KEY-backed service.
 *
 * Env: LINKEDIN_API_KEY placeholder (not used by stub).
 * Never logs PII. Never exposes raw input.
 */
import 'server-only';
import { normalizeLinkedinUrl } from '@/lib/identity';

export interface LinkedinEnrichment {
  url: string;
  normalizedUrl: string | null;
  valid: boolean;
  placeholder: true;
  // Future fields when provider is wired:
  // headline?: string | null;
  // company?: string | null;
  // location?: string | null;
  // connections?: number | null;
  message: string;
}

export interface LinkedinProvider {
  enrich(input: string): Promise<LinkedinEnrichment>;
  normalize(input: string): string | null;
}

export class StubLinkedinProvider implements LinkedinProvider {
  normalize(input: string): string | null {
    return normalizeLinkedinUrl(input);
  }

  async enrich(input: string): Promise<LinkedinEnrichment> {
    const normalized = normalizeLinkedinUrl(input);
    const valid = normalized !== null;
    return {
      url: input,
      normalizedUrl: normalized,
      valid,
      placeholder: true,
      message: valid
        ? 'LinkedIn enrichment is placeholder — no scraping. Provide LINKEDIN_API_KEY and swap to ApiLinkedinProvider for live enrichment.'
        : 'Invalid LinkedIn URL. Expected https://www.linkedin.com/in/<handle>/',
    };
  }
}

// Default singleton stub
export const linkedinProvider: LinkedinProvider = new StubLinkedinProvider();

/**
 * Convenience helper for identity-resolution: normalize linkedin URL if provided.
 */
export function normalizeLinkedin(input: string | null | undefined): string | null {
  if (!input) return null;
  return normalizeLinkedinUrl(input);
}

/**
 * Stub enrichment call — never scrapes. Returns normalized URL + placeholder.
 */
export async function enrichLinkedin(input: string): Promise<LinkedinEnrichment> {
  if (typeof window !== 'undefined') throw new Error('enrichLinkedin is server-only');
  return linkedinProvider.enrich(input);
}

// Future provider example (documented, not active):
// export class ApiLinkedinProvider implements LinkedinProvider {
//   constructor(private apiKey: string, private baseUrl: string) {}
//   normalize(input: string): string | null { return normalizeLinkedinUrl(input); }
//   async enrich(input: string): Promise<LinkedinEnrichment> {
//     const normalized = normalizeLinkedinUrl(input);
//     if (!normalized) return { url: input, normalizedUrl: null, valid: false, placeholder: true, message: 'Invalid URL' };
//     // Call licensed API with 10s timeout, Bearer token, 403/429 handling — similar to github.ts
//     // Never log PII, never expose API key via NEXT_PUBLIC_
//   }
// }
