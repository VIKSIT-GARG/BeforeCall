/**
 * Input sanitization — XSS prevention, HTML stripping, length limiting, URL validation.
 * All functions are pure and never throw for normal inputs.
 */

/**
 * Strip HTML tags. Removes anything between < and >.
 * Also removes event handler remnants and javascript: fragments.
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') return '';
  // Remove HTML tags
  let out = input.replace(/<[^>]*>/g, '');
  // Remove javascript: pseudo-protocol if any text remains
  out = out.replace(/javascript\s*:/gi, '');
  // Remove on* handler fragments like onerror= (defense in depth)
  out = out.replace(/\bon\w+\s*=/gi, '');
  return out;
}

/**
 * Sanitize a free-form string: strip HTML, trim, and truncate to maxLength.
 */
export function sanitizeString(input: string, maxLength: number): string {
  if (typeof input !== 'string') return '';
  let s = stripHtml(input);
  s = s.trim();
  // Collapse control characters
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (s.length > maxLength) s = s.slice(0, maxLength);
  return s;
}

/**
 * Validate that a string is a well-formed http/https URL.
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize URL: trim, enforce max length, allow only http/https, return normalized string or null.
 */
export function sanitizeUrl(url: string, maxLength = 2048): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim().slice(0, maxLength);
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize an attendee object field-by-field. Expects already-validated input.
 */
export function sanitizeAttendeeInput<T extends Record<string, unknown>>(attendee: T): T {
  const out: Record<string, unknown> = { ...attendee };
  if (typeof out.name === 'string') out.name = sanitizeString(out.name as string, 100);
  if (typeof out.email === 'string') out.email = sanitizeString(out.email as string, 254);
  if (typeof out.role === 'string') out.role = sanitizeString(out.role as string, 100);
  if (typeof out.company === 'string') out.company = sanitizeString(out.company as string, 100);
  if (typeof out.linkedin === 'string') out.linkedin = sanitizeString(out.linkedin as string, 500);
  if (typeof out.twitter === 'string') out.twitter = sanitizeString(out.twitter as string, 500);
  if (typeof out.notes === 'string') out.notes = sanitizeString(out.notes as string, 500);
  return out as T;
}

/**
 * Redact PII for logging: keep count and truncated title, never full attendees.
 */
export function redactForLog(data: { title?: string; attendees?: unknown[]; [k: string]: unknown }): Record<string, unknown> {
  return {
    title: typeof data.title === 'string' ? `${data.title.slice(0, 20)}...` : undefined,
    attendeeCount: Array.isArray(data.attendees) ? data.attendees.length : undefined,
  };
}
