/**
 * Attendee identity resolution — ContextOS-inspired.
 * Server-only. Never logs PII. Resolves attendee to confidence HIGH/MEDIUM/LOW/UNRESOLVED
 * with evidence provenance and namesake protection.
 * Added: refresh bypass, aligned github cache key (github:profile:username 24h),
 * parallel batch helper with semaphore.
 */
import 'server-only';
import { normalizeAttendeeInput, identityHash, normalizeName } from '@/lib/identity';
import type { GithubSnapshot } from '@/services/github';
import { cache, getTtlFor } from '@/lib/cache';
import { createLimiter } from '@/lib/semaphore';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

export interface Evidence {
  fact: string;
  sourceUrl: string;
  sourceType: 'github' | 'linkedin' | 'web' | 'company' | 'user_input';
  confidence: ConfidenceLevel;
  date: string; // ISO
}

export interface ResolvedIdentity {
  name: string;
  role?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
  githubUsername?: string | null;
  githubSnapshot?: GithubSnapshot | null;
  location?: string | null;
  summary?: string | null;
  confidence: ConfidenceLevel;
  evidence: Evidence[];
  lastResearched: string; // ISO
  needsMoreInfo?: boolean;
  message?: string;
}

export interface AttendeeInput {
  name: string;
  role?: string | null;
  company?: string | null;
  linkedin?: string | null;
  github?: string | null;
  githubUsername?: string | null;
  email?: string | null;
  twitter?: string | null;
  notes?: string | null;
}

function evidenceDate(): string {
  return new Date().toISOString();
}

function crossConsistent(
  inputCompany: string | null,
  githubSnapshot: GithubSnapshot | null,
  webEvidence: Evidence[]
): boolean {
  if (!inputCompany || !githubSnapshot?.company) return false;
  const a = inputCompany.toLowerCase().trim();
  const b = githubSnapshot.company.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  if (a && b.includes(a.split(' ')[0])) return true;
  // Also check web evidence mentions company
  const webMentionsCompany = webEvidence.some((e) => e.fact.toLowerCase().includes(a.toLowerCase()));
  return webMentionsCompany;
}

async function fetchWebEvidence(name: string, company: string | null, refresh?: boolean): Promise<Evidence[]> {
  const query = company ? `${name} ${company} professional profile` : `${name} professional profile`;
  try {
    // Dynamic import to avoid circular and allow mock injection
    const { searchPerson } = await import('@/services/research');
    const results = await searchPerson(name, company ?? undefined, { refresh });
    return results.slice(0, 3).map((r) => ({
      fact: r.title ? `${r.title}: ${r.snippet.slice(0, 120)}` : r.snippet.slice(0, 140),
      sourceUrl: r.url,
      sourceType: 'web' as const,
      confidence: r.credibility === 'high' ? 'MEDIUM' as ConfidenceLevel : 'LOW' as ConfidenceLevel,
      date: evidenceDate(),
    }));
  } catch {
    // Tavily unavailable — simulate candidate search as spec says
    // Return empty but allow confidence to degrade gracefully
    void query;
    return [];
  }
}

function computeConfidence(params: {
  hasCompany: boolean;
  hasRole: boolean;
  hasLinkedin: boolean;
  hasGithub: boolean;
  githubSnapshot: GithubSnapshot | null;
  webEvidenceCount: number;
  crossConsistent: boolean;
  hasEmail: boolean;
}): ConfidenceLevel {
  const { hasCompany, hasRole, hasLinkedin, hasGithub, githubSnapshot, webEvidenceCount, crossConsistent: cc, hasEmail } = params;

  // Namesake protection: only name provided
  if (!hasCompany && !hasRole && !hasLinkedin && !hasGithub && !hasEmail && webEvidenceCount === 0) return 'UNRESOLVED';

  let score = 0;
  if (hasCompany) score += 1;
  if (hasRole) score += 1;
  if (hasLinkedin) score += 2;
  if (hasGithub && githubSnapshot) score += 2;
  else if (hasGithub) score += 1;
  if (hasEmail) score += 1;
  if (webEvidenceCount >= 2) score += 1;
  else if (webEvidenceCount === 1) score += 0.5;
  if (cc) score += 1;

  if (score >= 5 && (hasGithub || hasLinkedin) && hasCompany) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  if (score >= 1.5) return 'LOW';
  return 'UNRESOLVED';
}

export async function resolveAttendeeIdentity(
  input: AttendeeInput,
  opts?: { refresh?: boolean }
): Promise<ResolvedIdentity> {
  if (typeof window !== 'undefined') throw new Error('resolveAttendeeIdentity is server-only');
  const refresh = !!opts?.refresh;
  const normalized = normalizeAttendeeInput(input);
  const lastResearched = evidenceDate();
  const evidence: Evidence[] = [];

  // User-input evidence (provenance) — always use provided fields first (smart planner)
  if (normalized.name) {
    evidence.push({
      fact: `Name provided: ${normalized.name}`,
      sourceUrl: 'user_input',
      sourceType: 'user_input',
      confidence: 'HIGH',
      date: lastResearched,
    });
  }
  if (normalized.company) {
    evidence.push({
      fact: `Company provided: ${normalized.company}`,
      sourceUrl: 'user_input',
      sourceType: 'user_input',
      confidence: 'HIGH',
      date: lastResearched,
    });
  }
  if (normalized.role) {
    evidence.push({
      fact: `Role provided: ${normalized.role}`,
      sourceUrl: 'user_input',
      sourceType: 'user_input',
      confidence: 'HIGH',
      date: lastResearched,
    });
  }
  if (normalized.linkedinUrl) {
    evidence.push({
      fact: `LinkedIn provided: ${normalized.linkedinUrl}`,
      sourceUrl: normalized.linkedinUrl,
      sourceType: 'linkedin',
      confidence: 'HIGH',
      date: lastResearched,
    });
  }
  if (normalized.githubUsername) {
    evidence.push({
      fact: `GitHub provided: ${normalized.githubUsername}`,
      sourceUrl: `https://github.com/${normalized.githubUsername}`,
      sourceType: 'github',
      confidence: 'HIGH',
      date: lastResearched,
    });
  }
  if (normalized.email) {
    evidence.push({
      fact: `Email provided: ${normalized.email.split('@')[1] ?? 'email'}`,
      sourceUrl: 'user_input',
      sourceType: 'user_input',
      confidence: 'MEDIUM',
      date: lastResearched,
    });
  }

  const hasName = !!normalized.name;
  const hasCompany = !!normalized.company;
  const hasRole = !!normalized.role;
  const hasLinkedin = !!normalized.linkedinUrl;
  const hasGithub = !!normalized.githubUsername;
  const hasEmail = !!normalized.email;

  // Namesake protection: insufficient evidence (only name)
  if (hasName && !hasCompany && !hasRole && !hasLinkedin && !hasGithub && !hasEmail) {
    return {
      name: normalized.name,
      role: normalized.role,
      company: normalized.company,
      linkedinUrl: normalized.linkedinUrl,
      githubUsername: normalized.githubUsername,
      githubSnapshot: null,
      location: null,
      summary: null,
      confidence: 'UNRESOLVED',
      evidence,
      lastResearched,
      needsMoreInfo: true,
      message: 'Insufficient evidence to disambiguate. Add company, role, LinkedIn URL, or GitHub username for reliable resolution.',
    };
  }

  // Identity cache key (dedup) — 24h
  const hash = identityHash(normalized);
  const cacheKey = `identity:${hash}`;

  // Check identity cache first (if we have a cached ResolvedIdentity) — bypass on refresh
  if (!refresh) {
    const cached = await cache.get<ResolvedIdentity>(cacheKey);
    if (cached) return cached;
  }

  // Fetch GitHub snapshot if username present (cached 24h via github:profile:username)
  let githubSnapshot: GithubSnapshot | null = null;
  if (normalized.githubUsername) {
    try {
      // Use lazy import to avoid circular
      const { fetchGithubSnapshot } = await import('@/services/github');
      // Use github:profile:username cache (aligned)
      githubSnapshot = await fetchGithubSnapshot(normalized.githubUsername!, process.env.GITHUB_TOKEN, { refresh });
      if (githubSnapshot) {
        evidence.push({
          fact: `GitHub profile: ${githubSnapshot.name ?? githubSnapshot.login} — ${githubSnapshot.bio?.slice(0, 100) ?? `${githubSnapshot.publicRepos} repos, ${githubSnapshot.followers} followers`}`,
          sourceUrl: githubSnapshot.profileUrl,
          sourceType: 'github',
          confidence: 'HIGH',
          date: evidenceDate(),
        });
        if (githubSnapshot.location) {
          evidence.push({
            fact: `Location: ${githubSnapshot.location}`,
            sourceUrl: githubSnapshot.profileUrl,
            sourceType: 'github',
            confidence: 'MEDIUM',
            date: evidenceDate(),
          });
        }
      }
    } catch (e) {
      // Rate-limit or not found — evidence as low confidence, do not throw
      const msg = e instanceof Error ? e.message.slice(0, 120) : 'GitHub fetch failed';
      evidence.push({
        fact: `GitHub lookup failed: ${msg}`,
        sourceUrl: `https://github.com/${normalized.githubUsername}`,
        sourceType: 'github',
        confidence: 'LOW',
        date: evidenceDate(),
      });
      githubSnapshot = null;
    }
  }

  // Candidate search via Tavily if no strong github signal or to cross-validate
  let webEvidence: Evidence[] = [];
  // Always attempt web evidence when we have name+company or name+role for cross-source consistency
  // Smart planner: if we already have HIGH signals from provided fields + github, we still fetch light web evidence but it may be cached (tavily:search:person 24h)
  if (hasName && (hasCompany || hasRole || !hasGithub)) {
    webEvidence = await fetchWebEvidence(normalized.name, normalized.company, refresh);
    evidence.push(...webEvidence);
  } else if (hasGithub && githubSnapshot) {
    // Still fetch light web evidence for consistency check (cached)
    const light = await fetchWebEvidence(normalized.name, normalized.company, refresh);
    webEvidence = light;
    // Only push if light has results, to avoid noise
    if (light.length) evidence.push(...light);
  }

  const cc = crossConsistent(normalized.company, githubSnapshot, webEvidence);
  const confidence = computeConfidence({
    hasCompany,
    hasRole,
    hasLinkedin,
    hasGithub,
    githubSnapshot,
    webEvidenceCount: webEvidence.length,
    crossConsistent: cc,
    hasEmail,
  });

  // Namesake protection post-evidence: if confidence still UNRESOLVED due to weak web evidence, keep UNRESOLVED
  const needsMoreInfo = confidence === 'UNRESOLVED';
  const message = needsMoreInfo
    ? 'Low confidence — potential namesake collision. Add company, role, LinkedIn URL, or GitHub username to improve resolution.'
    : undefined;

  const location = githubSnapshot?.location ?? null;
  const summaryParts: string[] = [];
  if (normalized.role) summaryParts.push(normalized.role);
  if (normalized.company) summaryParts.push(`at ${normalized.company}`);
  if (githubSnapshot?.bio) summaryParts.push(`— ${githubSnapshot.bio.slice(0, 140)}`);
  else if (webEvidence[0]) summaryParts.push(`— ${webEvidence[0].fact.slice(0, 140)}`);
  const summary = summaryParts.length ? summaryParts.join(' ') : null;

  const resolved: ResolvedIdentity = {
    name: normalized.name || normalizeName(input.name ?? ''),
    role: normalized.role,
    company: normalized.company,
    linkedinUrl: normalized.linkedinUrl,
    githubUsername: normalized.githubUsername,
    githubSnapshot,
    location,
    summary,
    confidence,
    evidence,
    lastResearched,
    needsMoreInfo,
    message,
  };

  // Cache resolved identity for 24h (even UNRESOLVED, to avoid hammering Tavily/GitHub) — also company:identity 24h semantics
  await cache.set(cacheKey, resolved, getTtlFor('identity')).catch(() => {});

  return resolved;
}

/** Batch helper for pipeline — now bounded parallel (concurrency 3) */
export async function resolveAttendees(
  inputs: AttendeeInput[],
  opts?: { refresh?: boolean; concurrency?: number }
): Promise<ResolvedIdentity[]> {
  const refresh = !!opts?.refresh;
  const concurrency = opts?.concurrency ?? 3;
  const limiter = createLimiter(concurrency);
  const out: ResolvedIdentity[] = new Array(inputs.length);
  await Promise.all(
    inputs.map((inp, idx) =>
      limiter.run(async () => {
        try {
          out[idx] = await resolveAttendeeIdentity(inp, { refresh });
        } catch {
          // On error, return UNRESOLVED stub
          out[idx] = {
            name: normalizeName(inp.name ?? ''),
            role: inp.role ?? null,
            company: inp.company ?? null,
            linkedinUrl: inp.linkedin ?? null,
            githubUsername: inp.github ?? null,
            githubSnapshot: null,
            location: null,
            summary: null,
            confidence: 'UNRESOLVED',
            evidence: [],
            lastResearched: evidenceDate(),
            needsMoreInfo: true,
            message: 'Resolution failed due to internal error.',
          };
        }
      })
    )
  );
  return out;
}
