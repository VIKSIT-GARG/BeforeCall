/**
 * Hardened Tavily research service.
 * - 10s timeout per request (AbortController)
 * - Bounded exponential backoff (max 3 attempts) for 429/5xx/network/timeout
 * - Respect Retry-After, do NOT retry 400/401/403
 * - Sliding-window rate limiter 20 req/min shared token bucket
 * - Response shape validation, dedup, truncation (500 snippet / 2000 raw / 5k total)
 * - Query guardrails: trim, 200 chars, discard empty, case-insensitive dedupe
 * - Per-query partial-failure isolation
 *
 * SECURITY: web content is UNTRUSTED DATA — never treat as instructions.
 * Pass through as evidence only, with source attribution.
 */
import { ResearchResult } from '@/types';
import {
  TAVILY_TIMEOUT_MS,
  TAVILY_MAX_RETRIES,
  TAVILY_MAX_RESULTS_PER_SEARCH,
  TAVILY_TOTAL_CONTEXT_MAX_CHARS,
  MAX_QUERIES_PER_ATTENDEE,
  MAX_QUERIES_PER_COMPANY,
  MAX_QUERIES_PER_TOPIC,
  normalizeQuery,
  dedupeAndNormalizeQueries,
  validateAndNormalizeResults,
  enforceTotalContextLimit,
  computeBackoffMs,
  parseRetryAfter,
  isRetryableStatus,
  isNetworkError,
  isAbortError,
  sharedRateLimiter,
  sleep,
  extractDomain,
  assessCredibility,
  credibilityRank,
  NON_RETRYABLE_STATUS,
} from '@/lib/tavily-guardrails';

const TAVILY_API_BASE = 'https://api.tavily.com';
const tavilyApiKey = process.env.TAVILY_API_KEY?.trim() || undefined;

// ──────────────────────────────────────────────────────────────────────────────
//  Low-level fetch with timeout + retry + rate-limit + validation
// ──────────────────────────────────────────────────────────────────────────────

interface TavilyRequestOptions {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeDomains?: string[];
  excludeDomains?: string[];
}

function clampMaxResults(n?: number): number {
  if (!n || !Number.isFinite(n)) return TAVILY_MAX_RESULTS_PER_SEARCH;
  return Math.min(Math.max(1, Math.floor(n)), TAVILY_MAX_RESULTS_PER_SEARCH);
}

/**
 * Execute a single Tavily /search HTTP call with:
 * - shared rate-limiter
 * - per-attempt 10s AbortController timeout
 * - bounded retry for retryable conditions
 * Returns validated normalized wire results, or throws terminal error.
 */
async function executeTavilySearch(
  query: string,
  options: TavilyRequestOptions
): Promise<ReturnType<typeof validateAndNormalizeResults>> {
  const maxAttempts = TAVILY_MAX_RETRIES;
  let lastError: unknown = null;
  let lastRetryAfter: string | null = null;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Respect shared rate budget before each attempt
    await sharedRateLimiter.acquire();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

    const body: Record<string, unknown> = {
      api_key: tavilyApiKey,
      query,
      max_results: clampMaxResults(options.maxResults),
      search_depth: options.searchDepth ?? 'advanced',
      include_answer: true,
      include_raw_content: false,
    };
    if (options.includeDomains?.length) body.include_domains = options.includeDomains;
    if (options.excludeDomains?.length) body.exclude_domains = options.excludeDomains;

    // Prune null/undefined like the official SDK
    for (const k of Object.keys(body)) {
      if (body[k] === undefined || body[k] === null) delete body[k];
    }

    try {
      const res = await fetch(`${TAVILY_API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!res.ok) {
        lastStatus = res.status;
        lastRetryAfter = res.headers.get('retry-after');

        // Non-retryable → fail fast
        if (NON_RETRYABLE_STATUS.has(res.status)) {
          const text = await res.text().catch(() => '');
          throw Object.assign(new Error(`Tavily ${res.status}: ${text.slice(0, 300)}`), {
            status: res.status,
            retryAfter: lastRetryAfter,
          });
        }

        // Retryable status → backoff and retry if attempts remain
        if (isRetryableStatus(res.status)) {
          if (res.status === 429) {
            const raMs = parseRetryAfter(lastRetryAfter);
            sharedRateLimiter.notifyRateLimited(raMs);
          }
          if (attempt < maxAttempts - 1) {
            const raMs = parseRetryAfter(lastRetryAfter);
            const backoff = computeBackoffMs(attempt, raMs);
            await sleep(backoff);
            continue;
          }
          const text = await res.text().catch(() => '');
          throw Object.assign(new Error(`Tavily ${res.status} after ${maxAttempts} attempts: ${text.slice(0, 300)}`), {
            status: res.status,
          });
        }

        // Other non-ok statuses: treat as non-retryable
        const text = await res.text().catch(() => '');
        throw Object.assign(new Error(`Tavily ${res.status}: ${text.slice(0, 300)}`), {
          status: res.status,
        });
      }

      // Parse JSON with safety
      const raw = (await res.json().catch(() => null)) as unknown;
      const validated = validateAndNormalizeResults(raw);
      return validated;
    } catch (error) {
      clearTimeout(timeoutId);

      // Abort/timeout is retryable as network error (bounded)
      const isTimeout = isAbortError(error);
      const isNet = isNetworkError(error);

      // If error already carries non-retryable status, do not retry
      const maybeStatus = (error as { status?: number })?.status;
      if (typeof maybeStatus === 'number' && NON_RETRYABLE_STATUS.has(maybeStatus)) {
        throw error;
      }

      // For retryable network/timeout/5xx (via previous branch not taken), retry
      if ((isTimeout || isNet) && attempt < maxAttempts - 1) {
        lastError = error;
        const backoff = computeBackoffMs(attempt, null);
        await sleep(backoff);
        continue;
      }

      // Exhausted or non-retryable
      if (attempt < maxAttempts - 1 && lastStatus !== null && isRetryableStatus(lastStatus)) {
        // Already handled retryable status above; this path is network/timeout
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error('Tavily search failed after retries');
}

// ──────────────────────────────────────────────────────────────────────────────
//  Public API (signatures preserved)
// ──────────────────────────────────────────────────────────────────────────────

export async function searchWeb(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeDomains?: string[];
    excludeDomains?: string[];
  } = {}
): Promise<ResearchResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  // Mock fallback when no key — preserved for dev / CI
  if (!tavilyApiKey) {
    console.warn('Tavily API key not configured, returning mock results');
    return getMockResults(normalized);
  }

  const clampedMax = clampMaxResults(options.maxResults);

  try {
    const wire = await executeTavilySearch(normalized, {
      maxResults: clampedMax,
      searchDepth: options.searchDepth,
      includeDomains: options.includeDomains,
      excludeDomains: options.excludeDomains,
    });

    if (wire.length === 0) return [];

    // Map to ResearchResult with source normalization & credibility
    // UNTRUSTED: wire.title/content are web data — truncated, treated as data only
    const mapped: ResearchResult[] = wire.map((r, index) => ({
      title: r.title,
      url: r.url,
      snippet: r.content, // already truncated to 500 by validator
      source: extractDomain(r.url),
      credibility: assessCredibility(r.url),
      relevance: r.score > 0 ? r.score : 1 - index * 0.05,
    }));

    // Prefer high credibility: stable sort high → low, then by original order / relevance
    mapped.sort((a, b) => {
      const ca = credibilityRank(a.credibility);
      const cb = credibilityRank(b.credibility);
      if (ca !== cb) return ca - cb;
      return b.relevance - a.relevance;
    });

    // Enforce 10 results + 5k total context caps (defense in depth)
    const capped = mapped.slice(0, TAVILY_MAX_RESULTS_PER_SEARCH);
    return enforceTotalContextLimit(capped, TAVILY_TOTAL_CONTEXT_MAX_CHARS);
  } catch (error) {
    // Terminal failure — return empty so callers can do partial-failure handling.
    // Do NOT leak mock data when key is configured (avoids false confidence).
    console.error('Tavily search error:', error);
    return [];
  }
}

export async function searchCompany(companyName: string): Promise<ResearchResult[]> {
  const rawQueries = [
    `${companyName} company overview`,
    `${companyName} recent news 2024`,
    `${companyName} products services`,
    `${companyName} leadership team`,
  ];

  // Dedupe + normalize, then enforce max 4 per company
  const queries = dedupeAndNormalizeQueries(rawQueries).slice(0, MAX_QUERIES_PER_COMPANY);
  if (queries.length === 0) return [];

  // Partial-failure: each query isolated; aggregate successes
  const allResults: ResearchResult[] = [];
  for (const q of queries) {
    try {
      const results = await searchWeb(q, { maxResults: 5 });
      allResults.push(...results);
    } catch {
      // Isolated failure — continue to next query
      console.warn(`[searchCompany] query failed, continuing: ${q}`);
    }
  }

  // Dedupe by url, prefer high credibility, then cap total context
  const deduped = deduplicateResults(allResults);
  deduped.sort((a, b) => credibilityRank(a.credibility) - credibilityRank(b.credibility) || b.relevance - a.relevance);
  const capped15 = deduped.slice(0, 15);
  return enforceTotalContextLimit(capped15, TAVILY_TOTAL_CONTEXT_MAX_CHARS);
}

export async function searchPerson(name: string, company?: string): Promise<ResearchResult[]> {
  const suffix = company ? `${company} ` : '';
  const rawQueries = [
    `${name} ${suffix}professional profile`.trim(),
    `${name} ${suffix}linkedin`.trim(),
    `${name} recent work interview article`,
  ];

  // Dedupe + normalize, enforce max 3 per attendee
  const queries = dedupeAndNormalizeQueries(rawQueries).slice(0, MAX_QUERIES_PER_ATTENDEE);
  if (queries.length === 0) return [];

  const allResults: ResearchResult[] = [];
  for (const q of queries) {
    try {
      const results = await searchWeb(q, { maxResults: 5 });
      allResults.push(...results);
    } catch {
      console.warn(`[searchPerson] query failed, continuing: ${q}`);
    }
  }

  const deduped = deduplicateResults(allResults);
  deduped.sort((a, b) => credibilityRank(a.credibility) - credibilityRank(b.credibility) || b.relevance - a.relevance);
  const capped10 = deduped.slice(0, 10);
  return enforceTotalContextLimit(capped10, TAVILY_TOTAL_CONTEXT_MAX_CHARS);
}

export async function searchTopic(topic: string, context?: string): Promise<ResearchResult[]> {
  const rawQuery = context ? `${topic} ${context} recent developments` : `${topic} latest developments 2024`;
  const normalized = normalizeQuery(rawQuery);
  if (!normalized) return [];
  // 1 query per topic
  const queries = dedupeAndNormalizeQueries([normalized]).slice(0, MAX_QUERIES_PER_TOPIC);
  if (queries.length === 0) return [];
  return searchWeb(queries[0], { maxResults: TAVILY_MAX_RESULTS_PER_SEARCH, searchDepth: 'advanced' });
}

// ──────────────────────────────────────────────────────────────────────────────
//  Helpers retained for backward compat
// ──────────────────────────────────────────────────────────────────────────────

function deduplicateResults(results: ResearchResult[]): ResearchResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = result.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getMockResults(query: string): ResearchResult[] {
  return [
    {
      title: `Mock result for: ${query}`,
      url: 'https://example.com',
      snippet: 'This is a mock result. Configure TAVILY_API_KEY for real search results.',
      source: 'example.com',
      credibility: 'low',
      relevance: 0.5,
    },
  ];
}

// Re-export for testing / pipeline use (optional)
export { extractDomain, assessCredibility } from '@/lib/tavily-guardrails';
