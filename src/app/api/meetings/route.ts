import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { meetingCreateSchema, formatZodError } from '@/lib/validations/meeting';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sanitizeString, sanitizeUrl } from '@/lib/sanitize';

export async function GET() {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        attendees: true,
        brief: true,
      },
    });
    return NextResponse.json({ success: true, data: meetings });
  } catch (error) {
    console.error('Error fetching meetings:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting: 30/min per IP for meetings
  const rate = checkRateLimit(request, 'meetings');
  if (!rate.allowed) {
    const retryAfterSec = Math.ceil(rate.retryAfterMs / 1000).toString();
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSec,
          'X-RateLimit-Limit': RATE_LIMITS.meetings.limit.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = meetingCreateSchema.safeParse(body);
    if (!parsed.success) {
      const details = formatZodError(parsed.error);
      return NextResponse.json({ success: false, error: `Validation failed: ${details}` }, { status: 400 });
    }

    const data = parsed.data;

    // Sanitization: strip HTML, enforce lengths, validate URLs (defense in depth)
    const title = sanitizeString(data.title, 200);
    const description = data.description ? sanitizeString(data.description, 2000) : undefined;
    const agenda = data.agenda ? sanitizeString(data.agenda, 5000) : undefined;
    const location = data.location ? sanitizeString(data.location, 200) : undefined;
    // meetingUrl already validated as http/https URL by Zod; re-sanitize
    const meetingUrl = data.meetingUrl ? sanitizeUrl(data.meetingUrl) ?? undefined : undefined;
    // Validate dateTime not NaN (Zod already checks parseable)
    const dateTime = new Date(data.dateTime);
    if (Number.isNaN(dateTime.getTime())) {
      return NextResponse.json({ success: false, error: 'Validation failed: dateTime: Invalid dateTime format' }, { status: 400 });
    }

    const sanitizedAttendees = data.attendees.map((a) => ({
      name: sanitizeString(a.name, 100),
      email: a.email ? sanitizeString(a.email, 254) : undefined,
      role: a.role ? sanitizeString(a.role, 100) : undefined,
      company: a.company ? sanitizeString(a.company, 100) : undefined,
      linkedin: a.linkedin ? sanitizeString(a.linkedin, 500) : undefined,
      twitter: a.twitter ? sanitizeString(a.twitter, 500) : undefined,
      notes: a.notes ? sanitizeString(a.notes, 500) : undefined,
    }));

    // If meetingUrl was provided but sanitization nulled it (e.g., javascript:), reject
    if (data.meetingUrl && !meetingUrl) {
      return NextResponse.json(
        { success: false, error: 'Validation failed: meetingUrl: Invalid URL format' },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        agenda,
        dateTime,
        duration: data.duration,
        location,
        meetingUrl,
        status: 'DRAFT',
        attendees: {
          create: sanitizedAttendees.map((a) => ({
            name: a.name,
            email: a.email,
            role: a.role,
            company: a.company,
            linkedin: a.linkedin,
            twitter: a.twitter,
            notes: a.notes,
          })),
        },
      },
      include: { attendees: true },
    });

    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    // Never leak stack traces or secrets; log generic message without PII
    console.error('Error creating meeting:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Failed to create meeting' }, { status: 500 });
  }
}
