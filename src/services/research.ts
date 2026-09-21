/**
 * Hardened Tavily research service.
 * - 10s timeout per request (AbortController)
 * - Bounded exponential backoff (max 3 attempts) for 429/5xx/network/timeout
 * - Respect Retry-After, do NOT retry 400/401/403
 * - Sliding-window rate limiter 20 req/min shared token bucket
 * - Response shape validation, dedup, truncation (500 snippet / 2000 raw / 5k total)
 * - Query guardrails: trim, 200 chars, discard empty, case-insensitive dedupe
 * - Per-query partial-failure isolation
 * - Caching (24h), CircuitBreaker (3 failures → 60s open), Budget (max 30 total Tavily)
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
import { cache, getTtlFor } from '@/lib/cache';
import { tavilyCircuitBreaker } from '@/lib/circuit-breaker';
import { globalBudget, BUDGET } from '@/lib/budget';

const TAVILY_API_BASE = 'https://api.tavily.com';
const tavilyApiKey = process.env.TAVILY_API_KEY?.trim() || undefined;

// ──────────────────────────────────────────────────────────────────────────────
//  Helpers: hashing + cache keys
// ──────────────────────────────────────────────────────────────────────────────
function fnv1aHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function hashQuery(q: string): string {
  // double hash to reduce collisions, lowercased
  const s = q.toLowerCase().trim();
  const h1 = fnv1aHash(s);
  const h2 = fnv1aHash(s.split('').reverse().join(''));
  return `${h1}${h2}`;
}

function tavilyCacheKey(kind: string, id: string): string {
  // spec: tavily:search:hash — we include kind for granularity
  return `tavily:search:${kind}:${hashQuery(id)}`;
}

// ──────────────────────────────────────────────────────────────────────────────
//  Low-level fetch with timeout + retry + rate-limit + validation + breaker + budget
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
 * - circuit breaker check
 * - budget check (max 30 total)
 * - shared rate-limiter
 * - per-attempt 10s AbortController timeout
 * - bounded retry for retryable conditions
 * Returns validated normalized wire results, or throws terminal error.
 */
async function executeTavilySearch(
  query: string,
  options: TavilyRequestOptions
): Promise<ReturnType<typeof validateAndNormalizeResults>> {
  // Circuit breaker: skip if open (use cache/known)
  if (!tavilyCircuitBreaker.canExecute()) {
    console.warn(`[tavily] circuit open, skipping query: ${query.slice(0, 60)}`);
    throw Object.assign(new Error('Tavily circuit open — skipped'), { status: 503, circuitOpen: true });
  }

  // Budget: enforce max 30 total Tavily queries/pipeline
  if (!globalBudget.canMakeTavilyQuery(1)) {
    console.warn(`[budget] Tavily total cap ${BUDGET.MAX_TOTAL_TAVILY_QUERIES} reached, skipping: ${query.slice(0, 60)}`);
    throw Object.assign(new Error('Tavily budget exhausted'), { status: 429, budgetExhausted: true });
  }

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
          const err = Object.assign(new Error(`Tavily ${res.status}: ${text.slice(0, 300)}`), {
            status: res.status,
            retryAfter: lastRetryAfter,
          });
          // 403 is not circuit-triggered (auth), but 429/5xx are
          throw err;
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
          const err = Object.assign(new Error(`Tavily ${res.status} after ${maxAttempts} attempts: ${text.slice(0, 300)}`), {
            status: res.status,
          });
          tavilyCircuitBreaker.recordFailure();
          throw err;
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
      // Success → record and budget
      tavilyCircuitBreaker.recordSuccess();
      globalBudget.recordTavilyQuery(1);
      return validated;
    } catch (error) {
      clearTimeout(timeoutId);

      const maybeCircuit = (error as { circuitOpen?: boolean })?.circuitOpen;
      const maybeBudget = (error as { budgetExhausted?: boolean })?.budgetExhausted;
      if (maybeCircuit || maybeBudget) throw error;

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

      // Final failure → record breaker
      const statusForBreaker = (error as { status?: number })?.status;
      if (typeof statusForBreaker === 'number' && isRetryableStatus(statusForBreaker)) {
        tavilyCircuitBreaker.recordFailure();
      } else if (isTimeout || isNet) {
        tavilyCircuitBreaker.recordFailure();
      }
      throw error;
    }
  }

  tavilyCircuitBreaker.recordFailure();
  throw lastError ?? new Error('Tavily search failed after retries');
}

// ──────────────────────────────────────────────────────────────────────────────
//  Public API (signatures preserved, added optional refresh)
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
    // Budget or circuit errors are expected caps — not log as error
    const maybeCircuit = (error as { circuitOpen?: boolean })?.circuitOpen;
    const maybeBudget = (error as { budgetExhausted?: boolean })?.budgetExhausted;
    if (maybeCircuit || maybeBudget) {
      console.warn('[tavily] skipped due to cap/circuit:', (error as Error).message);
      return [];
    }
    // Terminal failure — return empty so callers can do partial-failure handling.
    // Do NOT leak mock data when key is configured (avoids false confidence).
    console.error('Tavily search error:', error);
    return [];
  }
}

export async function searchCompany(
  companyName: string,
  opts?: { refresh?: boolean }
): Promise<ResearchResult[]> {
  const refresh = !!opts?.refresh;
  if (!companyName?.trim()) return [];
  const normalizedKey = companyName.trim().toLowerCase();
  const cacheKey = tavilyCacheKey('company', normalizedKey);

  const factory = async (): Promise<ResearchResult[]> => {
    const rawQueries = [
      `${companyName} company overview`,
      `${companyName} recent news 2024`,
      `${companyName} products services`,
      `${companyName} leadership team`,
    ];

    // Dedupe + normalize, then enforce max 4 per company (budget: 4)
    const queries = dedupeAndNormalizeQueries(rawQueries).slice(0, MAX_QUERIES_PER_COMPANY);
    if (queries.length === 0) return [];

    // Budget pre-check: if we cannot afford all queries, slice to remaining budget
    const remaining = BUDGET.MAX_TOTAL_TAVILY_QUERIES - globalBudget.getTavilyCount();
    if (remaining <= 0) {
      console.warn('[budget] skipping company research — budget exhausted');
      return [];
    }
    const budgetedQueries = remaining < queries.length ? queries.slice(0, remaining) : queries;

    // Partial-failure: each query isolated; aggregate successes
    const allResults: ResearchResult[] = [];
    for (const q of budgetedQueries) {
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
  };

  if (refresh) {
    const fresh = await factory();
    // update cache for next time
    await cache.set(cacheKey, fresh, getTtlFor('tavily')).catch(() => {});
    return fresh;
  }

  // Wrap with cache.getOrSet 24h
  return cache.getOrSet<ResearchResult[]>(cacheKey, factory, getTtlFor('tavily'));
}

export async function searchPerson(
  name: string,
  company?: string,
  opts?: { refresh?: boolean } | string // allow old signature company string overload
): Promise<ResearchResult[]> {
  // Handle overload: searchPerson(name, company, opts) vs searchPerson(name, companyString)
  let refresh = false;
  let effectiveCompany = company;
  if (typeof opts === 'object' && opts !== null && 'refresh' in opts) {
    refresh = !!(opts as { refresh?: boolean }).refresh;
  } else if (typeof opts === 'string') {
    // legacy: third arg was mis-used, ignore
  }

  if (!name?.trim()) return [];
  const keyRaw = `${name.trim().toLowerCase()}|${(company ?? '').trim().toLowerCase()}`;
  const cacheKey = tavilyCacheKey('person', keyRaw);

  const factory = async (): Promise<ResearchResult[]> => {
    const suffix = effectiveCompany ? `${effectiveCompany} ` : '';
    const rawQueries = [
      `${name} ${suffix}professional profile`.trim(),
      `${name} ${suffix}linkedin`.trim(),
      `${name} recent work interview article`,
    ];

    // Dedupe + normalize, enforce max 3 per attendee (budget: 3)
    const queries = dedupeAndNormalizeQueries(rawQueries).slice(0, MAX_QUERIES_PER_ATTENDEE);
    if (queries.length === 0) return [];

    const remaining = BUDGET.MAX_TOTAL_TAVILY_QUERIES - globalBudget.getTavilyCount();
    if (remaining <= 0) {
      console.warn('[budget] skipping person research — budget exhausted');
      return [];
    }
    const budgetedQueries = remaining < queries.length ? queries.slice(0, remaining) : queries;

    const allResults: ResearchResult[] = [];
    for (const q of budgetedQueries) {
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
  };

  if (refresh) {
    const fresh = await factory();
    await cache.set(cacheKey, fresh, getTtlFor('tavily')).catch(() => {});
    return fresh;
  }

  return cache.getOrSet<ResearchResult[]>(cacheKey, factory, getTtlFor('tavily'));
}

export async function searchTopic(
  topic: string,
  context?: string,
  opts?: { refresh?: boolean }
): Promise<ResearchResult[]> {
  const refresh = !!opts?.refresh;
  const rawQuery = context ? `${topic} ${context} recent developments` : `${topic} latest developments 2024`;
  const normalized = normalizeQuery(rawQuery);
  if (!normalized) return [];
  // 1 query per topic
  const queries = dedupeAndNormalizeQueries([normalized]).slice(0, MAX_QUERIES_PER_TOPIC);
  if (queries.length === 0) return [];
  const keyRaw = queries[0].toLowerCase();
  const cacheKey = tavilyCacheKey('topic', keyRaw);

  const factory = async (): Promise<ResearchResult[]> => {
    const remaining = BUDGET.MAX_TOTAL_TAVILY_QUERIES - globalBudget.getTavilyCount();
    if (remaining <= 0) {
      console.warn('[budget] skipping topic research — budget exhausted');
      return [];
    }
    return searchWeb(queries[0], { maxResults: TAVILY_MAX_RESULTS_PER_SEARCH, searchDepth: 'advanced' });
  };

  if (refresh) {
    const fresh = await factory();
    await cache.set(cacheKey, fresh, getTtlFor('tavily')).catch(() => {});
    return fresh;
  }

  return cache.getOrSet<ResearchResult[]>(cacheKey, factory, getTtlFor('tavily'));
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
export { tavilyCircuitBreaker } from '@/lib/circuit-breaker';
