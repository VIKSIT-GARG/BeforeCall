import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
//  Source schema (shared)
// ─────────────────────────────────────────────────────────────────────────────
export const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().or(z.string().min(1)),
  type: z.enum(['official', 'news', 'professional', 'social', 'other']),
  credibility: z.enum(['high', 'medium', 'low']),
  date: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
//  AttendeeProfile
// ─────────────────────────────────────────────────────────────────────────────
export const attendeeProfileSchema = z.object({
  currentRole: z.string().nullable().optional(),
  currentCompany: z.string().nullable().optional(),
  previousRoles: z
    .array(
      z.object({
        role: z.string(),
        company: z.string(),
        duration: z.string(),
      })
    )
    .optional()
    .default([]),
  expertise: z.array(z.string()).default([]),
  notableProjects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        link: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  interests: z.array(z.string()).default([]),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  sources: z.array(sourceSchema).default([]),
});

// ─────────────────────────────────────────────────────────────────────────────
//  CompanyResearch
// ─────────────────────────────────────────────────────────────────────────────
export const companyResearchSchema = z.object({
  summary: z.string().min(1),
  recentNews: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url().or(z.string().min(1)),
        date: z.string(),
        summary: z.string(),
      })
    )
    .optional()
    .default([]),
  products: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        url: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  keyPeople: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        profileUrl: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  insights: z.string().optional().default(''),
  sources: z.array(sourceSchema).default([]),
});

// ─────────────────────────────────────────────────────────────────────────────
//  TopicBrief
// ─────────────────────────────────────────────────────────────────────────────
export const topicBriefSchema = z.object({
  topic: z.string().min(1),
  context: z.string().min(1),
  recentDevelopments: z.string().min(1),
  whyItMatters: z.string().min(1),
  discussionAngle: z.string().min(1),
  sources: z.array(sourceSchema).default([]),
});

export const topicBriefsSchema = z.array(topicBriefSchema);

// ─────────────────────────────────────────────────────────────────────────────
//  MeetingBrief parts (LLM generates these; wrapper adds metadata)
// ─────────────────────────────────────────────────────────────────────────────
export const talkingPointsSchema = z.object({
  highPriority: z.array(z.string()),
  opportunity: z.array(z.string()),
  questions: z.array(z.string()),
  followUp: z.array(z.string()),
});

export const conversationStarterSchema = z.object({
  text: z.string().min(1),
  context: z.string(),
  attendee: z.string().optional(),
});

export const meetingBriefPartsSchema = z.object({
  tldr: z.array(z.string().min(1)).min(1),
  talkingPoints: talkingPointsSchema,
  conversationStarters: z.array(conversationStarterSchema),
  questions: z.array(z.string()),
  watchOuts: z.array(z.string()),
});

// ─────────────────────────────────────────────────────────────────────────────
//  Topics extraction
// ─────────────────────────────────────────────────────────────────────────────
export const topicsArraySchema = z.array(z.string().min(1));

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract JSON from LLM response that may be wrapped in markdown fences
 * or contain leading/trailing prose.
 */
export function extractJsonCandidates(raw: string): string[] {
  const candidates: string[] = [];
  const trimmed = raw.trim();

  // 1. Direct parse candidate
  candidates.push(trimmed);

  // 2. Markdown fence ```json ... ``` or ``` ... ```
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(raw)) !== null) {
    candidates.push(m[1].trim());
  }

  // 3. Heuristic: first {...} or [...] block
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(raw.slice(firstBrace, lastBrace + 1));
  }
  const firstBracket = raw.indexOf('[');
  const lastBracket = raw.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(raw.slice(firstBracket, lastBracket + 1));
  }

  // Deduplicate
  return Array.from(new Set(candidates));
}

export function parseAndValidate<T>(
  rawText: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const candidates = extractJsonCandidates(rawText);
  let lastError = 'No valid JSON found';

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const validated = schema.safeParse(parsed);
      if (validated.success) {
        return { success: true, data: validated.data };
      }
      lastError = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue;
    }
  }
  return { success: false, error: lastError };
}

export function buildRepairPrompt(
  originalPrompt: string,
  lastRaw: string,
  validationError: string
): string {
  return `${originalPrompt}\n\n---\nREPAIR INSTRUCTION: Your previous response failed validation.\nValidation error: ${validationError}\nPrevious raw output (truncated 1000 chars): ${lastRaw.slice(0, 1000)}\nRespond ONLY with valid JSON matching the requested schema. No prose, no markdown fences, just JSON.`;
}

// Re-exports for convenience
export type ValidatedAttendeeProfile = z.infer<typeof attendeeProfileSchema>;
export type ValidatedCompanyResearch = z.infer<typeof companyResearchSchema>;
export type ValidatedTopicBriefs = z.infer<typeof topicBriefsSchema>;
export type ValidatedMeetingBriefParts = z.infer<typeof meetingBriefPartsSchema>;
