import { z } from 'zod';

/**
 * Helpers for optional fields that allow empty strings to be treated as undefined.
 * Empty string, null, or undefined all become undefined before validation.
 */
const optionalLimitedString = (max: number) =>
  z.preprocess(
    (v) => {
      if (v === '' || v === null || v === undefined) return undefined;
      return v;
    },
    z.string().trim().max(max, `Must be at most ${max} characters`).optional()
  );

const optionalEmail = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    return v;
  },
  z
    .string()
    .trim()
    .max(254, 'Email must be at most 254 characters')
    .email('Invalid email format')
    .optional()
);

const optionalUrl = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    return v;
  },
  z
    .string()
    .trim()
    .max(2048, 'URL must be at most 2048 characters')
    .url('Invalid URL format')
    .refine(
      (val) => {
        try {
          const u = new URL(val);
          return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'URL must use http or https' }
    )
    .optional()
);

// LinkedIn/Twitter are free-form strings up to 500 chars; if they look like URLs we validate separately in sanitize layer.
// Here we only enforce length.
const optionalSocialString = optionalLimitedString(500);

// Duration: must be integer 15-480 if provided. Accept number or numeric string.
const optionalDuration = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isNaN(n)) return v; // let zod fail with type error
      return n;
    }
    return v;
  },
  z.number().int('Duration must be an integer').min(15, 'Duration must be at least 15 minutes').max(480, 'Duration must be at most 480 minutes').optional()
);

export const attendeeInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 1-100 characters'),
  email: optionalEmail,
  role: optionalLimitedString(100),
  company: optionalLimitedString(100),
  linkedin: optionalSocialString,
  twitter: optionalSocialString,
  notes: optionalLimitedString(500),
});

export const meetingCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 1-200 characters'),
  description: optionalLimitedString(2000),
  agenda: optionalLimitedString(5000),
  dateTime: z
    .string()
    .trim()
    .min(1, 'dateTime is required')
    .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid dateTime format' }),
  duration: optionalDuration,
  location: optionalLimitedString(200),
  meetingUrl: optionalUrl,
  attendees: z.array(attendeeInputSchema).min(1, 'At least one attendee is required').max(10, 'At most 10 attendees allowed'),
  additionalContext: optionalLimitedString(5000),
});

export const meetingUpdateSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 1-200 characters').optional(),
    description: optionalLimitedString(2000),
    agenda: optionalLimitedString(5000),
    dateTime: z
      .string()
      .trim()
      .min(1, 'dateTime is required')
      .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid dateTime format' })
      .optional(),
    duration: optionalDuration,
    location: optionalLimitedString(200),
    meetingUrl: optionalUrl,
    status: z.enum(['DRAFT', 'RESEARCHING', 'COMPLETED', 'ARCHIVED']).optional(),
    additionalContext: optionalLimitedString(5000),
  })
  .strict();

export type MeetingCreateInput = z.infer<typeof meetingCreateSchema>;
export type MeetingUpdateInput = z.infer<typeof meetingUpdateSchema>;
export type AttendeeInputValidated = z.infer<typeof attendeeInputSchema>;

/**
 * Format ZodError into single human-readable string for 400 response.
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}
