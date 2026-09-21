/**
 * ContextOS-inspired identity normalization — port of ContextOS normalize.ts
 * Server & shared utilities. Pure functions, no I/O. No secrets, no logs.
 */

export function clean(input: string): string {
  if (typeof input !== 'string') return '';
  let s = input.trim();
  // Remove zero-width / BOM
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Remove control chars
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Collapse whitespace (including NBSP)
  s = s.replace(/[\s\u00A0]+/g, ' ');
  return s.trim();
}

function toTitleCase(word: string): string {
  if (!word) return '';
  // Preserve acronyms of length <=3 that are already all-caps? Normalize to Title Case anyway for consistency.
  // Handle hyphenated and apostrophe parts
  return word
    .split(/([-'])/)
    .map((part) => {
      if (part === '-' || part === "'") return part;
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

const HONORIFICS = /^(mr|mrs|ms|miss|dr|prof|sr|jr)\.?\s+/i;

export function normalizeName(raw: string): string {
  const c = clean(raw);
  if (!c) return '';
  // Remove honorifics iteratively
  let s = c;
  let prev: string;
  do {
    prev = s;
    s = s.replace(HONORIFICS, '').trim();
  } while (s !== prev);
  // Collapse multiple spaces again after strip
  s = s.replace(/\s+/g, ' ');
  // Title case each word
  const words = s.split(' ').filter(Boolean);
  const titled = words.map(toTitleCase).join(' ');
  // Truncate to 100 (schema limit)
  return titled.slice(0, 100).trim();
}

export function normalizeTitle(raw: string): string {
  const c = clean(raw);
  if (!c) return '';
  // Collapse ws, trim, truncate 100
  const s = c.replace(/\s+/g, ' ').trim().slice(0, 100);
  // Title case but preserve small words? Simple title case for now
  // Keep slash and hyphen delimiters
  return s
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (/^(\s+|\/|-)$/.test(part)) return part;
      return toTitleCase(part);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

// Map raw title to coarse role category for dedupe / brief grouping
export type RoleCategory =
  | 'executive'
  | 'engineering'
  | 'product'
  | 'design'
  | 'sales'
  | 'marketing'
  | 'operations'
  | 'finance'
  | 'hr'
  | 'legal'
  | 'other';

export function roleCategory(title: string): RoleCategory {
  const t = clean(title).toLowerCase();
  if (!t) return 'other';
  if (/(chief|ceo|cto|coo|cfo|cmo|president|founder|co-founder|partner|vp\s|vice president|head of|director)/.test(t)) {
    // Director is ambiguous — treat as executive if combined with qualifier
    if (/(chief|ceo|cto|coo|cfo|president|founder|partner)/.test(t)) return 'executive';
    if (/director/.test(t) && /(executive|managing|senior)/.test(t)) return 'executive';
  }
  if (/(engineer|developer|architect|sre|devops|scientist|researcher|ml|ai\b)/.test(t)) return 'engineering';
  if (/(product manager|product owner|pm\b|product lead)/.test(t)) return 'product';
  if (/(designer|ux|ui\b|creative)/.test(t)) return 'design';
  if (/(sales|account executive|ae\b|business development|bd\b)/.test(t)) return 'sales';
  if (/(marketing|growth|brand|content)/.test(t)) return 'marketing';
  if (/(operations|ops\b|chief of staff|program manager)/.test(t)) return 'operations';
  if (/(finance|cfo|accountant|controller)/.test(t)) return 'finance';
  if (/(hr\b|human resources|people|talent|recruiter)/.test(t)) return 'hr';
  if (/(legal|counsel|attorney)/.test(t)) return 'legal';
  // Fallback heuristics
  if (/(cto|ceo)/.test(t)) return 'executive';
  if (/(manager|lead)/.test(t)) {
    if (/(engineer|tech)/.test(t)) return 'engineering';
    if (/(product)/.test(t)) return 'product';
    return 'other';
  }
  return 'other';
}

const ORG_SUFFIXES =
  /\b(inc\.?|incorporated|llc\.?|l\.l\.c\.?|ltd\.?|limited|corp\.?|corporation|co\.?|company|plc|gmbh|pty|pvt\.?|group|holdings?)\b\.?/gi;

export function normalizeOrganization(raw: string): string {
  const c = clean(raw);
  if (!c) return '';
  let s = c.replace(/\s+/g, ' ').trim();
  // Remove org suffixes for canonical comparison, but keep display? We keep display sans suffix for hash, but return title-cased without suffix.
  // For hash stability we strip suffixes; for display we also strip and title-case.
  s = s.replace(ORG_SUFFIXES, '').replace(/\s+/g, ' ').trim();
  // Remove trailing commas / periods
  s = s.replace(/[,.\s]+$/g, '').trim();
  if (!s) return '';
  const titled = s
    .split(' ')
    .filter(Boolean)
    .map(toTitleCase)
    .join(' ');
  return titled.slice(0, 100).trim();
}

const GITHUB_USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function parseGithubUsername(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;
  const c = clean(input);
  if (!c) return null;
  let s = c.trim();
  // Remove leading @
  if (s.startsWith('@')) s = s.slice(1).trim();
  // If URL, extract path
  try {
    // Handle bare domain without scheme by prefixing https://
    const withScheme = /^github\.com\//i.test(s) ? `https://${s}` : s;
    if (/^https?:\/\//i.test(withScheme) || /^github\.com\//i.test(s)) {
      const u = new URL(withScheme.startsWith('http') ? withScheme : `https://${withScheme}`);
      const host = u.hostname.toLowerCase().replace(/^www\./, '');
      if (host === 'github.com' || host.endsWith('.github.com')) {
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length >= 1) s = parts[0];
        else return null;
      }
    }
  } catch {
    // Not a URL, treat as raw username, continue
  }
  // Strip query/fragment remnants if still present
  s = s.split(/[?#\s/]/)[0].trim();
  // Strip trailing .git
  s = s.replace(/\.git$/i, '');
  s = s.toLowerCase();
  if (!GITHUB_USERNAME_RE.test(s)) return null;
  if (s.startsWith('-') || s.endsWith('-')) return null;
  if (s.includes('--')) {
    // GitHub actually allows consecutive hyphens? spec says not, but be permissive — only reject leading/trailing.
  }
  return s.slice(0, 39);
}

export function normalizeUrl(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;
  const c = clean(input);
  if (!c) return null;
  let s = c.trim().slice(0, 2048);
  if (!s) return null;
  // Add scheme if missing bare domain like example.com/path
  if (!/^https?:\/\//i.test(s)) {
    // Only auto-prefix if looks like domain
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) s = `https://${s}`;
    else return null;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    // Normalize: lowercase host, remove default ports, preserve path
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return null;
  }
}

export function normalizeLinkedinUrl(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;
  const c = clean(input);
  if (!c) return null;
  let s = c.trim().slice(0, 2048);
  if (!s) return null;
  // Add scheme if missing
  if (!/^https?:\/\//i.test(s)) {
    // Strip leading www.
    s = s.replace(/^www\./i, '');
    if (/^linkedin\.com\//i.test(s)) s = `https://${s}`;
    else if (/^linkedin\.com$/i.test(s)) return null;
    else if (/^[\w.-]*linkedin\.com/i.test(s)) s = `https://${s.replace(/^https?:\/\//i, '')}`;
    else return null;
  }
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (!host.includes('linkedin.com')) return null;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    // Must contain /in/ for personal profile (allow /company/ as well but normalize to /in/ only for attendee)
    const path = u.pathname.replace(/\/+/g, '/');
    // Normalize to https://www.linkedin.com/in/<handle>/
    // Validate handle segment exists
    const match = path.match(/\/in\/([^/]+)\/?/i);
    if (match) {
      const handle = match[1].trim().replace(/\/+$/, '');
      if (!handle || handle.length > 100) return null;
      // Handles: alphanumeric, hyphen, allow unicode? Keep simple
      return `https://www.linkedin.com/in/${handle.replace(/[^a-zA-Z0-9-_]/g, '')}/`;
    }
    // Allow company pages as well — normalize but return null for personal identity? Accept /company/ as valid linkedinUrl for company context
    const companyMatch = path.match(/\/company\/([^/]+)\/?/i);
    if (companyMatch) {
      const handle = companyMatch[1].trim();
      if (!handle) return null;
      return `https://www.linkedin.com/company/${handle.replace(/[^a-zA-Z0-9-_]/g, '')}/`;
    }
    // If no /in/ or /company/, invalid for our purposes
    return null;
  } catch {
    return null;
  }
}

export function slugify(input: string): string {
  const c = clean(input);
  if (!c) return '';
  return c
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// ── Attendee normalization ──────────────────────────────────────────────────

export interface NormalizedAttendeeInput {
  name: string;
  role: string | null;
  company: string | null;
  githubUsername: string | null;
  linkedinUrl: string | null;
  email: string | null;
}

export function normalizeAttendeeInput(raw: {
  name?: unknown;
  role?: unknown;
  company?: unknown;
  github?: unknown;
  githubUsername?: unknown;
  linkedin?: unknown;
  linkedinUrl?: unknown;
  email?: unknown;
}): NormalizedAttendeeInput {
  const nameRaw = typeof raw.name === 'string' ? raw.name : String(raw.name ?? '');
  const name = normalizeName(nameRaw);

  const roleRaw = typeof raw.role === 'string' ? raw.role : typeof raw.role === 'undefined' || raw.role === null ? '' : String(raw.role);
  const roleNorm = normalizeTitle(roleRaw);
  const role = roleNorm || null;

  const companyRaw = typeof raw.company === 'string' ? raw.company : typeof raw.company === 'undefined' || raw.company === null ? '' : String(raw.company);
  const companyNorm = normalizeOrganization(companyRaw);
  const company = companyNorm || null;

  const githubCandidate =
    (typeof raw.githubUsername === 'string' && raw.githubUsername) ||
    (typeof raw.github === 'string' && raw.github) ||
    null;
  const githubUsername = githubCandidate ? parseGithubUsername(githubCandidate) : null;

  const linkedinCandidate =
    (typeof raw.linkedinUrl === 'string' && raw.linkedinUrl) ||
    (typeof raw.linkedin === 'string' && raw.linkedin) ||
    null;
  const linkedinUrl = linkedinCandidate ? normalizeLinkedinUrl(linkedinCandidate) : null;

  const emailRaw = typeof raw.email === 'string' ? raw.email.trim().toLowerCase().slice(0, 254) : null;
  const email = emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;

  return { name, role, company, githubUsername, linkedinUrl, email };
}

// ── Identity hash ───────────────────────────────────────────────────────────

/**
 * Deterministic hash of normalized attendee identity for cache keys / dedupe.
 * Uses FNV-1a 32-bit doubled to produce 16-char hex without Node crypto dependency,
 * stable across runtimes. Lowercases canonical form before hashing.
 */
function fnv1a32(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function identityHash(input: NormalizedAttendeeInput | { name: string; company?: string | null; role?: string | null; githubUsername?: string | null; linkedinUrl?: string | null; email?: string | null }): string {
  const norm: NormalizedAttendeeInput =
    'githubUsername' in input && 'linkedinUrl' in input && 'email' in input
      ? (input as NormalizedAttendeeInput)
      : normalizeAttendeeInput(input as Record<string, unknown>);
  const canonical = [
    norm.name.toLowerCase(),
    (norm.company ?? '').toLowerCase(),
    (norm.role ?? '').toLowerCase(),
    (norm.githubUsername ?? '').toLowerCase(),
    (norm.linkedinUrl ?? '').toLowerCase(),
    (norm.email ?? '').toLowerCase(),
  ].join('|');
  // Double hash to reduce collision
  const h1 = fnv1a32(canonical);
  const h2 = fnv1a32(canonical.split('').reverse().join(''));
  return `${h1}${h2}`;
}
