/**
 * Hardened Caching + Concurrency Layer.
 * Server-only.
 *
 * Implements:
 * 1. Read-through cache helper: `cached(key, ttl, versioned, load_fn)`
 * 2. In-flight request de-duplication (singleflight promise map)
 * 3. Versioned invalidation for database-backed reads (incrementing version, 500ms in-process memoization)
 * 4. Deterministic normalized input hashing
 * 5. Fail-fast cache client configuration (~1s connect timeout, low retry, no offline queueing)
 * 6. Preserves existing in-memory Map store + optional Prisma DB fallback
 */
import 'server-only';
import { createHash } from 'crypto';

export type CacheKind = 'tavily' | 'extraction' | 'github' | 'identity' | 'company' | 'default';

function envMs(name: string, fallbackMs: number): number {
  const raw = process.env[name];
  if (!raw) return fallbackMs;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallbackMs;
  return Math.floor(n);
}

function envHoursToMs(name: string, fallbackHours: number): number {
  const raw = process.env[name];
  if (!raw) return fallbackHours * 3600 * 1000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallbackHours * 3600 * 1000;
  if (name.includes('_MS')) return Math.floor(n);
  return Math.floor(n) * 3600 * 1000;
}

// ──────────────────────────────────────────────────────────────────────────────
// TTLs & Configuration
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Justification of TTLs:
 * (a) Search-style results (Tavily/web queries): 24 hours.
 *     Meeting prep queries about attendees, company overviews, and developments
 *     do not change significantly within the same working day. 24h ensures fast
 *     instant repeated queries and multi-attendee overlaps while staying within a 1-day freshness cycle.
 * (b) Page/document extraction results & attendee profiles: 7 days.
 *     Extracted bios, work history, repositories, and published articles change very slowly.
 *     Caching profiles for 7 days saves expensive LLM tokens and API calls. A `refresh: true` bypass
 *     is available whenever fresh data is explicitly demanded.
 */
export const CACHE_TTLS: Record<CacheKind, number> = {
  tavily: envMs('CACHE_TTL_TAVILY_MS', envHoursToMs('RESEARCH_CACHE_TTL_HOURS', 24)),
  extraction: envMs('CACHE_TTL_EXTRACTION_MS', 7 * 24 * 3600 * 1000),
  github: envMs('CACHE_TTL_GITHUB_MS', 24 * 3600 * 1000),
  identity: envMs('CACHE_TTL_IDENTITY_MS', 24 * 3600 * 1000),
  company: envMs('CACHE_TTL_COMPANY_MS', 24 * 3600 * 1000),
  default: envMs('CACHE_TTL_DEFAULT_MS', 24 * 3600 * 1000),
};

export function getTtlFor(kind: CacheKind): number {
  return CACHE_TTLS[kind] ?? CACHE_TTLS.default;
}

// Fail-fast timeout configuration
export const CACHE_CONNECT_TIMEOUT_MS = envMs('CACHE_CONNECT_TIMEOUT_MS', 1000); // 1000ms (~1s)
export const CACHE_MAX_RETRIES = 1;
export const CACHE_OFFLINE_QUEUE = false;

// ──────────────────────────────────────────────────────────────────────────────
// Deterministic Input Hashing & Key Building
// ──────────────────────────────────────────────────────────────────────────────

function normalizeForHash(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val.trim().toLowerCase();
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) {
    return val.map(normalizeForHash);
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>).sort();
    const sorted: Record<string, unknown> = {};
    for (const k of keys) {
      const v = (val as Record<string, unknown>)[k];
      if (v !== undefined) {
        sorted[k] = normalizeForHash(v);
      }
    }
    return sorted;
  }
  return String(val);
}

/**
 * Deterministically hash any input object / parameters.
 * Same logical input (regardless of object key order or casing) always produces the same hash.
 */
export function hashNormalizedInput(input: unknown): string {
  const normalized = normalizeForHash(input);
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 32);
}

/**
 * Build a canonical cache key with a prefix and normalized input.
 */
export function buildCacheKey(prefix: string, input: unknown): string {
  const hash = hashNormalizedInput(input);
  return `${prefix}:${hash}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Fail-fast timeout helper
// ──────────────────────────────────────────────────────────────────────────────

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = CACHE_CONNECT_TIMEOUT_MS
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Cache operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// In-Memory Backing Store
// ──────────────────────────────────────────────────────────────────────────────

interface Entry {
  value: unknown;
  expiresAt: number;
}

export const CACHE_MAX_ENTRIES = envMs('CACHE_MAX_ENTRIES', 500);

class InMemoryCache {
  private store = new Map<string, Entry>();
  private hits = 0;
  private misses = 0;

  private isExpired(e: Entry): boolean {
    return Date.now() > e.expiresAt;
  }

  private pruneIfExpired(key: string): void {
    const e = this.store.get(key);
    if (e && this.isExpired(e)) this.store.delete(key);
  }

  private evictIfNecessary(): void {
    if (this.store.size < CACHE_MAX_ENTRIES) return;

    // Pass 1: Prune expired entries
    const now = Date.now();
    this.store.forEach((e, k) => {
      if (now > e.expiresAt) {
        this.store.delete(k);
      }
    });

    // Pass 2: Evict oldest entries if still at or exceeding capacity (LRU)
    while (this.store.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = this.store.keys().next().value;
      if (!oldestKey) break;
      this.store.delete(oldestKey);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    this.pruneIfExpired(key);
    const e = this.store.get(key);
    if (e && !this.isExpired(e)) {
      this.hits++;
      // Touch for LRU ordering
      this.store.delete(key);
      this.store.set(key, e);
      return typeof e.value === 'object' && e.value !== null
        ? JSON.parse(JSON.stringify(e.value)) as T
        : (e.value as T);
    }

    // Memory miss -> optional DB fallback
    if (process.env.CACHE_DB_FALLBACK === 'true' || process.env.CACHE_DB_FALLBACK === '1') {
      try {
        const { prisma } = await import('@/lib/prisma');
        const row = await prisma.cacheEntry.findUnique({ where: { key } });
        if (row) {
          if (new Date(row.expiresAt).getTime() > Date.now()) {
            try {
              const parsed = JSON.parse(row.value) as T;
              const ttlRem = new Date(row.expiresAt).getTime() - Date.now();
              if (ttlRem > 0) {
                this.evictIfNecessary();
                this.store.set(key, { value: parsed, expiresAt: Date.now() + ttlRem });
              }
              this.hits++;
              return parsed;
            } catch {}
          } else {
            await prisma.cacheEntry.delete({ where: { key } }).catch(() => {});
          }
        }
      } catch {}
    }

    this.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? Math.floor(ttlMs) : CACHE_TTLS.default;
    this.evictIfNecessary();
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + ttl });

    if (process.env.CACHE_DB_FALLBACK === 'true' || process.env.CACHE_DB_FALLBACK === '1') {
      try {
        const { prisma } = await import('@/lib/prisma');
        const expiresAt = new Date(Date.now() + ttl);
        const ser = JSON.stringify(value);
        await prisma.cacheEntry
          .upsert({
            where: { key },
            create: { key, value: ser, expiresAt },
            update: { value: ser, expiresAt },
          })
          .catch(() => {});
      } catch {}
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cachedVal = await this.get<T>(key);
    if (cachedVal !== null) return cachedVal;
    const value = await factory();
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttlMs);
    }
    return value;
  }

  async invalidate(pattern: string): Promise<number> {
    if (!pattern) return 0;
    if (pattern === '*') {
      const n = this.store.size;
      this.store.clear();
      if (process.env.CACHE_DB_FALLBACK === 'true' || process.env.CACHE_DB_FALLBACK === '1') {
        try {
          const { prisma } = await import('@/lib/prisma');
          await prisma.cacheEntry.deleteMany({}).catch(() => {});
        } catch {}
      }
      return n;
    }

    const hasWildcard = pattern.includes('*');
    if (!hasWildcard) {
      const existed = this.store.delete(pattern) ? 1 : 0;
      if (process.env.CACHE_DB_FALLBACK === 'true' || process.env.CACHE_DB_FALLBACK === '1') {
        try {
          const { prisma } = await import('@/lib/prisma');
          await prisma.cacheEntry.delete({ where: { key: pattern } }).catch(() => {});
        } catch {}
      }
      return existed;
    }

    let removed = 0;
    const regex = new RegExp(
      '^' +
        pattern
          .split('*')
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*') +
        '$'
    );
    for (const k of Array.from(this.store.keys())) {
      if (regex.test(k)) {
        this.store.delete(k);
        removed++;
      }
    }
    if (process.env.CACHE_DB_FALLBACK === 'true' || process.env.CACHE_DB_FALLBACK === '1') {
      try {
        const { prisma } = await import('@/lib/prisma');
        const rows = await prisma.cacheEntry.findMany({ select: { key: true } }).catch(() => []);
        const toDelete = (rows as { key: string }[]).filter((r) => regex.test(r.key)).map((r) => r.key);
        for (const k of toDelete) {
          await prisma.cacheEntry.delete({ where: { key: k } }).catch(() => {});
        }
      } catch {}
    }
    return removed;
  }

  hitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return this.hits / total;
  }

  stats(): { hits: number; misses: number; hitRate: number; size: number } {
    return { hits: this.hits, misses: this.misses, hitRate: this.hitRate(), size: this.store.size };
  }

  reset(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  _size(): number {
    return this.store.size;
  }
}

export const cache = new InMemoryCache();

// ──────────────────────────────────────────────────────────────────────────────
// In-Flight Request De-duplication (Singleflight)
// ──────────────────────────────────────────────────────────────────────────────

const inFlightRequests = new Map<string, Promise<unknown>>();

export function getInFlightCount(): number {
  return inFlightRequests.size;
}

// ──────────────────────────────────────────────────────────────────────────────
// Versioned Invalidation for Database-Derived Data
// ──────────────────────────────────────────────────────────────────────────────

const dataVersions = new Map<string, number>();

interface VersionMemo {
  version: number;
  fetchedAt: number;
}
const versionMemoMap = new Map<string, VersionMemo>();
export const VERSION_MEMO_TTL_MS = 500; // ~500ms in-process memoization

export async function getDataVersion(entityType: string): Promise<number> {
  const memo = versionMemoMap.get(entityType);
  const now = Date.now();
  if (memo && now - memo.fetchedAt < VERSION_MEMO_TTL_MS) {
    return memo.version;
  }

  let version = dataVersions.get(entityType) ?? 1;
  if (process.env.CACHE_DB_FALLBACK === 'true' || process.env.CACHE_DB_FALLBACK === '1') {
    try {
      const { prisma } = await import('@/lib/prisma');
      const row = await prisma.cacheEntry.findUnique({ where: { key: `__data_version:${entityType}` } }).catch(() => null);
      if (row) {
        const parsed = parseInt(row.value, 10);
        if (!Number.isNaN(parsed)) version = parsed;
      }
    } catch {}
  }

  versionMemoMap.set(entityType, { version, fetchedAt: now });
  return version;
}

export async function incrementDataVersion(entityType: string): Promise<number> {
  const current = (dataVersions.get(entityType) ?? 1) + 1;
  dataVersions.set(entityType, current);
  versionMemoMap.set(entityType, { version: current, fetchedAt: Date.now() });

  if (process.env.CACHE_DB_FALLBACK === 'true' || process.env.CACHE_DB_FALLBACK === '1') {
    try {
      const { prisma } = await import('@/lib/prisma');
      await prisma.cacheEntry
        .upsert({
          where: { key: `__data_version:${entityType}` },
          create: {
            key: `__data_version:${entityType}`,
            value: String(current),
            expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
          },
          update: { value: String(current) },
        })
        .catch(() => {});
    } catch {}
  }

  return current;
}

export function resetDataVersions(): void {
  dataVersions.clear();
  versionMemoMap.clear();
}

// ──────────────────────────────────────────────────────────────────────────────
// Read-Through Cache Helper
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Wrap any external research or database call in a read-through cache.
 *
 * @param key Base key (or prefix+hash).
 * @param ttl Time-to-live in ms.
 * @param versioned Boolean or string entity name. If true/string, ties to incrementing data version without short TTL.
 * @param load_fn Async factory function that makes the actual call on cache miss.
 * @param opts Optional bypass settings (e.g. { refresh: true }).
 */
export async function cached<T>(
  key: string,
  ttl: number,
  versioned: boolean | string,
  load_fn: () => Promise<T>,
  opts?: { refresh?: boolean }
): Promise<T> {
  let actualKey = key;
  let effectiveTtl = ttl;

  // Versioned invalidation for database-backed reads
  if (versioned) {
    const entityType = typeof versioned === 'string' ? versioned : 'default';
    const version = await getDataVersion(entityType);
    actualKey = `${key}:v${version}`;
    // Versioned reads don't need short TTLs — invalidated via INCR; default to 30 days
    if (!effectiveTtl || effectiveTtl <= 0) {
      effectiveTtl = 30 * 24 * 3600 * 1000;
    }
  }

  // 1. Read-through cache lookup (fail-fast: aborts if backend takes > CACHE_CONNECT_TIMEOUT_MS)
  if (!opts?.refresh) {
    try {
      const hit = await withTimeout(cache.get<T>(actualKey), CACHE_CONNECT_TIMEOUT_MS);
      if (hit !== null && hit !== undefined) {
        return hit;
      }
    } catch (cacheErr) {
      // Backend failure must never be a reason a request fails or hangs -> fall through to load_fn
      console.warn(`[cache] read failure on ${actualKey}, falling through to load_fn:`, (cacheErr as Error).message);
    }

    // 2. In-flight request de-duplication
    const inFlight = inFlightRequests.get(actualKey);
    if (inFlight) {
      try {
        return (await inFlight) as T;
      } catch {
        // If in-flight failed, proceed to load_fn directly
      }
    }
  }

  // 3. Cache miss or in-flight initiator: create promise and register in map
  const flight = (async () => {
    try {
      const result = await load_fn();
      if (result !== null && result !== undefined) {
        try {
          await withTimeout(cache.set(actualKey, result, effectiveTtl), CACHE_CONNECT_TIMEOUT_MS);
        } catch (cacheSetErr) {
          console.warn(`[cache] write failure on ${actualKey}, continuing:`, (cacheSetErr as Error).message);
        }
      }
      return result;
    } finally {
      inFlightRequests.delete(actualKey);
    }
  })();

  inFlightRequests.set(actualKey, flight);
  return flight;
}

// ──────────────────────────────────────────────────────────────────────────────
// Legacy Named Re-exports
// ──────────────────────────────────────────────────────────────────────────────

export async function get<T>(key: string): Promise<T | null> {
  return cache.get<T>(key);
}
export async function set<T>(key: string, value: T, ttlMs: number): Promise<void> {
  return cache.set<T>(key, value, ttlMs);
}
export async function getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
  return cache.getOrSet<T>(key, factory, ttlMs);
}
export async function invalidate(pattern: string): Promise<number> {
  return cache.invalidate(pattern);
}
export function hitRate(): number {
  return cache.hitRate();
}

export default cache;
