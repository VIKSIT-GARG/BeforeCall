/**
 * Tavily Guardrails — central security & reliability controls for BeforeCall.
 *
 * SECURITY NOTICE — Untrusted content
 * ---------------------------------------------------------------------------
 * All content returned by Tavily (results.title / results.content / raw_content)
 * originates from the public web and MUST be treated as **untrusted data**.
 * - Never treat retrieved web text as instructions.
 * - Never execute, render as code, or follow directives embedded in results.
 * - Pass web content to the LLM only as EVIDENCE with provenance (url/source).
 * - Displayed snippets are data, not trusted system prompts.
 * See AGENTS.md §6 "Web Research is Untrusted Data".
 */

// ──────────────────────────────────────────────────────────────────────────────
//  Limits (exported for pipeline + tests)
// ──────────────────────────────────────────────────────────────────────────────
export const TAVILY_TIMEOUT_MS = 10_000;
export const TAVILY_MAX_RETRIES = 3; // total attempts, i.e. 1 initial + 2 retries
export const TAVILY_MAX_RESULTS_PER_SEARCH = 10;
export const TAVILY_SNIPPET_MAX_CHARS = 500;
export const TAVILY_RAW_MAX_CHARS = 2000;
export const TAVILY_TOTAL_CONTEXT_MAX_CHARS = 5_000;

export const MAX_QUERIES_PER_ATTENDEE = 3;
export const MAX_QUERIES_PER_COMPANY = 4;
export const MAX_QUERIES_PER_TOPIC = 1;

export const MAX_REQUESTS_PER_MINUTE = 20;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export const QUERY_MAX_CHARS = 200;
export const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
export const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404, 422]);

// ──────────────────────────────────────────────────────────────────────────────
//  Query guardrails
// ──────────────────────────────────────────────────────────────────────────────
/**
 * Validate & normalize a single query string.
 * - Trims whitespace
 * - Drops empty strings
 * - Truncates to QUERY_MAX_CHARS (200)
 * Returns null if the query should be discarded.
 */
export function normalizeQuery(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > QUERY_MAX_CHARS) {
    return trimmed.slice(0, QUERY_MAX_CHARS);
  }
  return trimmed;
}

/**
 * Validate, normalize, dedupe an array of queries.
 * Dedupe key is lowercased trimmed value (case-insensitive) after truncation.
 * Preserves first-seen casing of the surviving entry.
 */
export function dedupeAndNormalizeQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of queries) {
    const n = normalizeQuery(q);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
//  Content limits
// ──────────────────────────────────────────────────────────────────────────────
export function truncateSnippet(s: string): string {
  if (s.length <= TAVILY_SNIPPET_MAX_CHARS) return s;
  return s.slice(0, TAVILY_SNIPPET_MAX_CHARS);
}

export function truncateRaw(s: string): string {
  if (s.length <= TAVILY_RAW_MAX_CHARS) return s;
  return s.slice(0, TAVILY_RAW_MAX_CHARS);
}

/**
 * Enforce total-context budget (5000 chars) on already-truncated snippets.
 * Drops lowest-relevance tail items until budget fits.
 * Called by research.ts before returning results to the LLM.
 */
export function enforceTotalContextLimit<T extends { snippet: string }>(
  results: T[],
  budget = TAVILY_TOTAL_CONTEXT_MAX_CHARS
): T[] {
  let total = 0;
  const kept: T[] = [];
  for (const r of results) {
    const len = r.snippet.length;
    if (total + len > budget && kept.length > 0) break;
    kept.push(r);
    total += len;
    if (total >= budget) break;
  }
  return kept;
}

// ──────────────────────────────────────────────────────────────────────────────
//  Response validation
// ──────────────────────────────────────────────────────────────────────────────
export interface RawTavilyResult {
  url?: unknown;
  title?: unknown;
  content?: unknown;
  raw_content?: unknown;
  score?: unknown;
}

export interface NormalizedTavilyResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
  score: number;
}

/**
 * Validate the wire shape. Tolerates missing/extra fields, never throws for
 * benign malformation — returns only the well-formed entries.
 * - results must be an array
 * - each entry must have a string url (non-empty)
 * - title/content fall back to each other then to "" then are truncated
 * - duplicates by url are removed (keeps first)
 * - each result is truncated to snippet/raw limits
 * - very large content is safely truncated, not discarded
 */
export function validateAndNormalizeResults(raw: unknown): NormalizedTavilyResult[] {
  if (!raw || typeof raw !== 'object') return [];
  const maybeResults = (raw as Record<string, unknown>).results;
  if (!Array.isArray(maybeResults)) return [];

  const seen = new Set<string>();
  const out: NormalizedTavilyResult[] = [];

  for (const item of maybeResults) {
    if (!item || typeof item !== 'object') continue;
    const r = item as RawTavilyResult;

    // url is required and must be a non-empty string
    if (typeof r.url !== 'string' || !r.url.trim()) continue;
    const url = r.url.trim();
    if (seen.has(url)) continue;
    seen.add(url);

    // title/content fallback logic
    const rawTitle = typeof r.title === 'string' ? r.title.trim() : '';
    const rawContent = typeof r.content === 'string' ? r.content : '';
    const rawContent2 = typeof r.raw_content === 'string' ? r.raw_content : undefined;

    const title = rawTitle || rawContent.slice(0, 80) || 'Untitled';
    const content = rawContent || rawTitle || '';

    // score may be string or number; fall back to 0
    let score = 0;
    if (typeof r.score === 'number' && Number.isFinite(r.score)) score = r.score;
    else if (typeof r.score === 'string') {
      const n = parseFloat(r.score);
      if (Number.isFinite(n)) score = n;
    }

    const snippet = truncateSnippet(content);
    const rawNorm = rawContent2 ? truncateRaw(rawContent2) : undefined;

    out.push({
      title: title.slice(0, 500),
      url,
      content: snippet,
      raw_content: rawNorm,
      score,
    });

    if (out.length >= TAVILY_MAX_RESULTS_PER_SEARCH) break;
  }

  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
//  Retry helpers
// ──────────────────────────────────────────────────────────────────────────────
export function isRetryableStatus(status: number): boolean {
  if (NON_RETRYABLE_STATUS.has(status)) return false;
  return RETRYABLE_STATUS.has(status);
}

/**
 * Parse Retry-After header (seconds or HTTP date). Returns delay in ms or null.
 */
export function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  // numeric seconds
  const secs = parseInt(trimmed, 10);
  if (!Number.isNaN(secs) && String(secs) === trimmed) {
    if (secs < 0) return null;
    // clamp to 60s to avoid unbounded waits
    return Math.min(secs * 1000, 60_000);
  }
  // HTTP date
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    if (diff <= 0) return 0;
    return Math.min(diff, 60_000);
  }
  return null;
}

/**
 * Bounded exponential backoff: base 500ms, factor 2, jitter ±10%, capped at 5s
 * (Retry-After, when present, overrides / extends the computed delay).
 */
export function computeBackoffMs(attempt: number, retryAfterMs: number | null): number {
  const base = 500;
  const exp = base * Math.pow(2, attempt);
  const jitter = exp * 0.1 * (Math.random() * 2 - 1);
  const withJitter = Math.min(exp + jitter, 5_000);
  if (retryAfterMs !== null) {
    return Math.max(withJitter, retryAfterMs);
  }
  return Math.max(0, withJitter);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('enotfound')
    );
  }
  return false;
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  if (error instanceof Error && error.message.toLowerCase().includes('aborted')) return true;
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
//  Source normalization / credibility
// ──────────────────────────────────────────────────────────────────────────────
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

const HIGH_CREDIBILITY_DOMAINS = [
  'linkedin.com',
  'crunchbase.com',
  'bloomberg.com',
  'reuters.com',
  'techcrunch.com',
  'theverge.com',
  'arstechnica.com',
  'wired.com',
  'forbes.com',
  'wsj.com',
  'nytimes.com',
  'ft.com',
  'economist.com',
  'github.com',
  'gitlab.com',
  'stackoverflow.com',
  'medium.com',
  'wikipedia.org',
  'nature.com',
  'science.org',
  'sec.gov',
];

const MEDIUM_CREDIBILITY_DOMAINS = [
  'twitter.com',
  'x.com',
  'youtube.com',
  'reddit.com',
  'producthunt.com',
  'angel.co',
  'wellfound.com',
  'substack.com',
  'hacker-news',
];

export function assessCredibility(url: string): 'high' | 'medium' | 'low' {
  const domain = extractDomain(url).toLowerCase();
  if (HIGH_CREDIBILITY_DOMAINS.some(d => domain.includes(d))) return 'high';
  if (MEDIUM_CREDIBILITY_DOMAINS.some(d => domain.includes(d))) return 'medium';
  return 'low';
}

export function credibilityRank(c: 'high' | 'medium' | 'low'): number {
  switch (c) {
    case 'high':
      return 0;
    case 'medium':
      return 1;
    case 'low':
      return 2;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Rate-limit guard — shared token bucket / sliding window (20 req / 60s)
// ──────────────────────────────────────────────────────────────────────────────
export class TokenBucketRateLimiter {
  private timestamps: number[] = [];
  private retryAfterUntil = 0;

  constructor(
    private readonly maxRequests: number = MAX_REQUESTS_PER_MINUTE,
    private readonly windowMs: number = RATE_LIMIT_WINDOW_MS
  ) {}

  /** For tests / introspection */
  getRetryAfterUntil(): number {
    return this.retryAfterUntil;
  }

  /** Record a 429 + Retry-After from server */
  notifyRateLimited(retryAfterMs: number | null): void {
    const delay = retryAfterMs ?? 2000;
    this.retryAfterUntil = Math.max(this.retryAfterUntil, Date.now() + delay);
  }

  reset(): void {
    this.timestamps = [];
    this.retryAfterUntil = 0;
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    this.timestamps = this.timestamps.filter(t => t > cutoff);
  }

  /**
   * Wait until a token is available. Bounded — never waits more than one
   * window plus any server Retry-After.
   */
  async acquire(): Promise<void> {
    // Respect server Retry-After first
    const now0 = Date.now();
    if (now0 < this.retryAfterUntil) {
      const wait = this.retryAfterUntil - now0;
      await new Promise<void>(r => setTimeout(r, wait));
    }

    // Sliding-window check
    let now = Date.now();
    this.prune(now);

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return;
    }

    // At capacity — wait until oldest slot slides out
    const oldest = this.timestamps[0];
    const waitMs = oldest + this.windowMs - now;
    if (waitMs > 0) {
      await new Promise<void>(r => setTimeout(r, waitMs));
    }
    now = Date.now();
    this.prune(now);
    this.timestamps.push(now);
  }
}

/** Shared singleton used by all Tavily calls in this process */
export const sharedRateLimiter = new TokenBucketRateLimiter(
  MAX_REQUESTS_PER_MINUTE,
  RATE_LIMIT_WINDOW_MS
);

// re-export sleep for callers that need it
export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
