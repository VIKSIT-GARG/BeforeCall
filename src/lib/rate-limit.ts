import { NextRequest } from 'next/server';

export const RATE_LIMITS = {
  research: { limit: 10, windowMs: 60_000 },
  meetings: { limit: 30, windowMs: 60_000 },
  export: { limit: 5, windowMs: 60_000 },
} as const;

export type RateLimiterKey = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
  limit: number;
}

// Per-limiter per-IP sliding window store
const stores: Map<RateLimiterKey, Map<string, number[]>> = new Map();

function getStore(key: RateLimiterKey): Map<string, number[]> {
  let s = stores.get(key);
  if (!s) {
    s = new Map();
    stores.set(key, s);
  }
  return s;
}

/**
 * Extract client IP. In production behind a proxy, x-forwarded-for is authoritative.
 * Falls back to x-real-ip or unknown. Never throws.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();
  const cf = request.headers.get('cf-connecting-ip');
  if (cf?.trim()) return cf.trim();
  // NextRequest does not expose ip directly; use unknown fallback
  return 'unknown';
}

/**
 * In-memory token bucket / sliding window check per IP.
 */
export function checkRateLimit(request: NextRequest, limiter: RateLimiterKey): RateLimitResult {
  const config = RATE_LIMITS[limiter];
  const ip = getClientIp(request);
  const store = getStore(limiter);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let timestamps = store.get(ip) || [];
  // prune expired
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= config.limit) {
    const oldest = timestamps[0];
    const retryAfterMs = oldest + config.windowMs - now;
    store.set(ip, timestamps);
    return {
      allowed: false,
      retryAfterMs: Math.max(0, retryAfterMs),
      remaining: 0,
      limit: config.limit,
    };
  }

  timestamps.push(now);
  store.set(ip, timestamps);
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: config.limit - timestamps.length,
    limit: config.limit,
  };
}

/**
 * For tests / manual reset
 */
export function resetRateLimitStore(limiter?: RateLimiterKey): void {
  if (limiter) {
    stores.delete(limiter);
  } else {
    stores.clear();
  }
}

// Cleanup stale entries periodically to bound memory (runs only in long-lived processes)
// Prune entries that are fully outside window; executed lazily on checkRateLimit.
// For explicit cleanup, call pruneAll().
export function pruneAll(): void {
  const now = Date.now();
  for (const [key, store] of Array.from(stores.entries())) {
    const cfg = RATE_LIMITS[key as RateLimiterKey];
    for (const [ip, ts] of Array.from(store.entries())) {
      const filtered = ts.filter((t: number) => now - t < cfg.windowMs);
      if (filtered.length === 0) store.delete(ip);
      else store.set(ip, filtered);
    }
  }
}
