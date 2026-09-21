/**
 * In-memory cache provider mimicking ContextOS Redis.
 * Server-only. Supports TTLs, getOrSet, invalidate(pattern), hitRate().
 * Optional CacheEntry DB fallback (Prisma) when CACHE_DB_FALLBACK=true.
 * TTLs configurable via env; defaults: Tavily 24h, extraction 7d, github 24h, identity 24h, company 24h.
 */
import 'server-only';

type CacheKind = 'tavily' | 'extraction' | 'github' | 'identity' | 'company' | 'default';

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
  // If env value looks like hours (<= 720 = 30d), treat as hours; else as ms if > 10000
  // Heuristic: if env name contains MS, treat as ms directly
  if (name.includes('_MS')) return Math.floor(n);
  return Math.floor(n) * 3600 * 1000;
}

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

interface Entry {
  value: unknown;
  expiresAt: number;
}

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

  async get<T>(key: string): Promise<T | null> {
    this.pruneIfExpired(key);
    const e = this.store.get(key);
    if (e && !this.isExpired(e)) {
      this.hits++;
      return e.value as T;
    }
    // Memory miss → optional DB fallback
    if (process.env.CACHE_DB_FALLBACK === 'true' || process.env.CACHE_DB_FALLBACK === '1') {
      try {
        const { prisma } = await import('@/lib/prisma');
        const row = await prisma.cacheEntry.findUnique({ where: { key } });
        if (row) {
          if (new Date(row.expiresAt).getTime() > Date.now()) {
            try {
              const parsed = JSON.parse(row.value) as T;
              // Populate memory for next hit (remaining TTL)
              const ttlRem = new Date(row.expiresAt).getTime() - Date.now();
              if (ttlRem > 0) this.store.set(key, { value: parsed, expiresAt: Date.now() + ttlRem });
              this.hits++;
              return parsed;
            } catch {
              // ignore parse error
            }
          } else {
            // expired → delete lazily
            await prisma.cacheEntry.delete({ where: { key } }).catch(() => {});
          }
        }
      } catch {
        // prisma not available or DB error — ignore, treat as miss
      }
    }
    this.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const ttl = Number.isFinite(ttlMs) && ttlMs > 0 ? Math.floor(ttlMs) : CACHE_TTLS.default;
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
      } catch {
        // ignore
      }
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    // Do not cache null/undefined sentinel unless factory explicitly wants to
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttlMs);
    }
    return value;
  }

  /**
   * Invalidate keys matching pattern.
   * Supports:
   *  - exact key (no wildcard)
   *  - prefix*  (e.g., "github:*")
   *  - *suffix  (e.g., "*:identity")
   *  - *substring* (contains)
   *  - "*" (clear all)
   */
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
    // Wildcard handling
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
        // Prisma doesn't support regex; fetch all keys and filter in JS for DB fallback (bounded)
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

  /** For testing: allow direct inspection */
  _size(): number {
    return this.store.size;
  }
}

// Singleton like ContextOS Redis client
export const cache = new InMemoryCache();

// Named re-exports mimicking Redis-like API
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
