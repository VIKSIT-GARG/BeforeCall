/**
 * Cheap local routing & short-circuit logic.
 *
 * Rules:
 * Run deterministic local logic BEFORE any expensive external API or LLM call.
 * If local information is sufficient or indicates no-op, short-circuit immediately in 0ms.
 */

const GENERIC_COMPANIES = new Set([
  'none',
  'n/a',
  'na',
  'self',
  'self-employed',
  'freelance',
  'freelancer',
  'consultant',
  'independent',
  'stealth',
  'stealth startup',
  'personal',
  'unknown',
  'student',
  'tbd',
  'unemployed',
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'mail.com',
]);

const PLACEHOLDER_ATTENDEE_NAMES = new Set([
  'tbd',
  'unknown',
  'guest',
  'host',
  'none',
  'n/a',
  'na',
  'attendee',
  'someone',
  'user',
]);

/**
 * Extract structured agenda topics locally using regex & line parsing.
 *
 * Short-circuits the expensive extractMeetingTopics LLM call when:
 * 1. Both agenda and description are empty/blank -> returns [] immediately (0ms).
 * 2. Agenda already contains a clear list of 2-10 numbered items, bullet points, or discrete lines.
 *
 * Returns string[] if resolved locally, or null if free-form semantic LLM extraction is genuinely required.
 */
export function extractTopicsLocally(
  agenda?: string | null,
  description?: string | null
): string[] | null {
  const cleanAgenda = (agenda || '').trim();
  const cleanDesc = (description || '').trim();

  // Case 1: Empty or trivial input -> 0 topics needed, no LLM call
  if (!cleanAgenda && cleanDesc.length < 10) {
    return [];
  }

  if (!cleanAgenda) {
    return null; // Description may have narrative topics; fall back to LLM
  }

  // Case 2: Structured numbered or bulleted list in agenda
  const lines = cleanAgenda
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const itemRegex = /^(?:(?:\d+[\.\)]|\*|-|\u2022|\u25E6)\s+)(.+)$/;
  const extracted: string[] = [];

  for (const line of lines) {
    const match = line.match(itemRegex);
    if (match && match[1]) {
      const topic = match[1].trim();
      // Only treat as topic if reasonable length (not an entire paragraph)
      if (topic.length >= 2 && topic.length <= 80) {
        extracted.push(topic);
      }
    }
  }

  // If we found at least 2 distinct structured items, return them directly
  if (extracted.length >= 2 && extracted.length <= 10) {
    return Array.from(new Set(extracted));
  }

  // If there are 2-5 short lines without bullets (e.g. simple newline list)
  if (lines.length >= 2 && lines.length <= 6) {
    const allShort = lines.every((l) => l.length >= 3 && l.length <= 60 && !l.endsWith('.'));
    if (allShort) {
      return Array.from(new Set(lines));
    }
  }

  return null; // Fall back to LLM semantic extraction
}

/**
 * Check if a company string is generic, an email provider, or placeholder.
 * Short-circuits 4 Tavily search queries + 1 LLM company synthesis call in 0ms.
 */
export function isGenericOrNonCompany(company?: string | null): boolean {
  if (!company) return true;
  const clean = company
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9\.\-\s]/g, '');

  if (clean.length <= 1) return true;
  if (GENERIC_COMPANIES.has(clean)) return true;
  if (clean.endsWith('.edu') && !clean.includes(' ')) return true;
  return false;
}

/**
 * Check if an attendee name is a placeholder or meaningless string.
 */
export function isPlaceholderAttendee(name?: string | null): boolean {
  if (!name) return true;
  const clean = name.trim().toLowerCase();
  if (clean.length < 2) return true;
  return PLACEHOLDER_ATTENDEE_NAMES.has(clean);
}

/**
 * Validate and clean GitHub username locally before issuing external GitHub API requests.
 * Accepts raw usernames or profile URLs, strips '@', and verifies valid GitHub regex.
 * Short-circuits 3 GitHub HTTP API calls if invalid.
 */
export function cleanAndValidateGithubUsername(raw?: string | null): string | null {
  if (!raw) return null;
  let username = raw.trim();

  // Strip full profile URL if provided
  const urlMatch = username.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch && urlMatch[1]) {
    username = urlMatch[1];
  }

  username = username.replace(/^@+/, '').trim().toLowerCase();
  if (!username) return null;

  // GitHub username spec: max 39 chars, alphanumeric or single hyphen, cannot begin/end with hyphen
  const valid = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/.test(username);
  return valid ? username : null;
}
