/**
 * GitHub intelligence — port of ContextOS github.ts
 * Server-only. Uses native fetch, 10s timeout, Bearer token from GITHUB_TOKEN.
 * Handles 403/429 rate-limit, performs 3 calls: user, repos?per_page=60, events/public?per_page=100
 * and computes languageShares, weeklyActivity (12 weeks), commits90d, externalContributions, lastEventAt.
 * Added: cache wrapper (github:profile:username 24h), budget caps (max 60 repos), refresh bypass.
 */
import 'server-only';
import { cache, getTtlFor, cached, buildCacheKey } from '@/lib/cache';
import { globalBudget, BUDGET } from '@/lib/budget';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TIMEOUT_MS = 10_000;

export interface GithubSnapshot {
  username: string;
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  avatarUrl: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  totalStars: number;
  languageShares: Record<string, number>; // 0..1 fraction per language
  languages: Record<string, number>; // raw counts
  weeklyActivity: number[]; // 12 weeks, commits per week (0 = oldest, 11 = current)
  commits90d: number;
  externalContributions: number;
  lastEventAt: string | null;
  fetchedAt: string;
  profileUrl: string;
}

type FetchOpts = {
  token?: string;
  signal?: AbortSignal;
};

function getToken(explicit?: string): string | undefined {
  const t = (explicit ?? process.env.GITHUB_TOKEN ?? '').trim();
  return t ? t : undefined;
}

function parseRetryAfter(h: string | null): number | null {
  if (!h) return null;
  const secs = parseInt(h.trim(), 10);
  if (!Number.isNaN(secs) && String(secs) === h.trim()) return secs * 1000;
  const d = Date.parse(h.trim());
  if (!Number.isNaN(d)) {
    const diff = d - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

async function githubFetch(path: string, token: string | undefined): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'BeforeCall',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function handleRateLimit(res: Response): never {
  const ra = parseRetryAfter(res.headers.get('retry-after'));
  const msg = `GitHub rate limited: ${res.status}${ra !== null ? ` retry-after ${ra}ms` : ''}`;
  const err = Object.assign(new Error(msg), { status: res.status, retryAfter: ra });
  throw err;
}

async function fetchGithubSnapshotInternal(username: string, explicitToken?: string): Promise<GithubSnapshot> {
  const login = username.trim().toLowerCase();
  if (!login) throw new Error('username required');
  // Validate username shape (reuse light check)
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/.test(login)) throw new Error(`Invalid GitHub username: ${username}`);
  const token = getToken(explicitToken);

  // 3 concurrent calls (user, repos, events) via Promise.allSettled — failure of repos/events won't kill user lookup
  const perPage = Math.min(60, BUDGET.MAX_GITHUB_REPOS);
  const [userSettled, reposSettled, eventsSettled] = await Promise.allSettled([
    githubFetch(`/users/${encodeURIComponent(login)}`, token),
    githubFetch(`/users/${encodeURIComponent(login)}/repos?per_page=${perPage}&sort=updated&type=owner`, token),
    githubFetch(`/users/${encodeURIComponent(login)}/events/public?per_page=100`, token),
  ]);

  if (userSettled.status === 'rejected') {
    throw userSettled.reason;
  }
  const userRes = userSettled.value;

  // Handle rate-limit / auth errors early
  const settledResponses: Response[] = [userRes];
  if (reposSettled.status === 'fulfilled') settledResponses.push(reposSettled.value);
  if (eventsSettled.status === 'fulfilled') settledResponses.push(eventsSettled.value);

  for (const r of settledResponses) {
    if (r.status === 403 || r.status === 429) {
      const remaining = r.headers.get('x-ratelimit-remaining');
      if (remaining === '0' || r.status === 429) handleRateLimit(r);
      if (r.status === 403 && remaining === '0') handleRateLimit(r);
    }
  }

  if (!userRes.ok) {
    const text = await userRes.text().catch(() => '');
    if (userRes.status === 404) throw Object.assign(new Error(`GitHub user not found: ${login}`), { status: 404 });
    throw Object.assign(new Error(`GitHub user fetch failed ${userRes.status}: ${text.slice(0, 300)}`), { status: userRes.status });
  }
  const user = (await userRes.json()) as Record<string, unknown>;

  let repos: Array<Record<string, unknown>> = [];
  if (reposSettled.status === 'fulfilled' && reposSettled.value.ok) {
    repos = (await reposSettled.value.json().catch(() => [])) as Array<Record<string, unknown>>;
    if (!Array.isArray(repos)) repos = [];
    if (repos.length > BUDGET.MAX_GITHUB_REPOS) repos = repos.slice(0, BUDGET.MAX_GITHUB_REPOS);
    globalBudget.recordGithubRepos(repos.length);
  } else {
    console.warn(`[github] repos fetch failed or non-ok for ${login}, continuing with empty`);
  }

  let events: Array<Record<string, unknown>> = [];
  if (eventsSettled.status === 'fulfilled' && eventsSettled.value.ok) {
    events = (await eventsSettled.value.json().catch(() => [])) as Array<Record<string, unknown>>;
    if (!Array.isArray(events)) events = [];
  } else {
    console.warn(`[github] events fetch failed or non-ok for ${login}, continuing with empty`);
  }

  // Compute languages
  const langCounts: Record<string, number> = {};
  let totalStars = 0;
  for (const r of repos) {
    const lang = typeof r.language === 'string' ? (r.language as string).trim() : '';
    if (lang) langCounts[lang] = (langCounts[lang] ?? 0) + 1;
    const stars = typeof r.stargazers_count === 'number' ? r.stargazers_count : 0;
    totalStars += stars;
  }
  const totalWithLang = Object.values(langCounts).reduce((a, b) => a + b, 0);
  const languageShares: Record<string, number> = {};
  for (const [k, v] of Object.entries(langCounts)) {
    languageShares[k] = totalWithLang ? v / totalWithLang : 0;
  }

  // Weekly activity (12 weeks) from PushEvents
  const weeklyActivity = Array.from({ length: 12 }, () => 0);
  const now = Date.now();
  const weekMs = 7 * 24 * 3600 * 1000;
  let externalContributions = 0;
  let lastEventAt: string | null = null;
  let commits90d = 0;
  const cutoff90d = now - 90 * 24 * 3600 * 1000;

  for (const ev of events) {
    const createdAt = typeof ev.created_at === 'string' ? (ev.created_at as string) : null;
    if (createdAt) {
      if (!lastEventAt || new Date(createdAt).getTime() > new Date(lastEventAt).getTime()) lastEventAt = createdAt;
    }
    const type = ev.type as string | undefined;
    const repo = ev.repo as { name?: string } | undefined;
    const repoName = repo?.name ?? '';
    const isExternal = repoName && !repoName.toLowerCase().startsWith(`${login}/`);
    if (isExternal && type === 'PushEvent') externalContributions++;

    if (type === 'PushEvent' && createdAt) {
      const t = new Date(createdAt).getTime();
      if (Number.isNaN(t)) continue;
      if (t >= cutoff90d) {
        const payload = ev.payload as { commits?: unknown[]; size?: number } | undefined;
        const commitCount = Array.isArray(payload?.commits) ? payload!.commits!.length : typeof payload?.size === 'number' ? payload!.size : 1;
        commits90d += commitCount;
      }
      const weeksAgo = Math.floor((now - new Date(createdAt).getTime()) / weekMs);
      if (weeksAgo >= 0 && weeksAgo < 12) {
        const payload = ev.payload as { commits?: unknown[]; size?: number } | undefined;
        const commitCount = Array.isArray(payload?.commits) ? payload!.commits!.length : typeof payload?.size === 'number' ? payload!.size : 1;
        // weeklyActivity[0] = oldest, [11] = current week
        const idx = 11 - weeksAgo;
        weeklyActivity[idx] += commitCount;
      }
    }
  }

  const snapshot: GithubSnapshot = {
    username: login,
    login,
    name: typeof user.name === 'string' ? (user.name as string) : null,
    bio: typeof user.bio === 'string' ? (user.bio as string) : null,
    location: typeof user.location === 'string' ? (user.location as string) : null,
    company: typeof user.company === 'string' ? (user.company as string) : null,
    avatarUrl: typeof user.avatar_url === 'string' ? (user.avatar_url as string) : null,
    followers: typeof user.followers === 'number' ? user.followers : 0,
    following: typeof user.following === 'number' ? user.following : 0,
    publicRepos: typeof user.public_repos === 'number' ? user.public_repos : repos.length,
    totalStars,
    languageShares,
    languages: langCounts,
    weeklyActivity,
    commits90d,
    externalContributions,
    lastEventAt,
    fetchedAt: new Date().toISOString(),
    profileUrl: `https://github.com/${login}`,
  };
  return snapshot;
}

export async function fetchGithubSnapshot(
  username: string,
  explicitToken?: string,
  opts?: { refresh?: boolean }
): Promise<GithubSnapshot> {
  if (typeof window !== 'undefined') throw new Error('fetchGithubSnapshot is server-only');
  const login = username.trim().toLowerCase();
  if (!login) throw new Error('username required');
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/.test(login)) throw new Error(`Invalid GitHub username: ${username}`);
  const refresh = !!opts?.refresh;
  const cacheKey = buildCacheKey('github:profile', { username: login });
  const factory = () => fetchGithubSnapshotInternal(username, explicitToken);
  return cached<GithubSnapshot>(cacheKey, getTtlFor('github'), false, factory, { refresh });
}

export function isGithubRateLimitError(err: unknown): boolean {
  const s = (err as { status?: number })?.status;
  return s === 403 || s === 429;
}
