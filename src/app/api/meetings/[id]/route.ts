import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { meetingUpdateSchema, formatZodError } from '@/lib/validations/meeting';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sanitizeString, sanitizeUrl } from '@/lib/sanitize';
import { cached, incrementDataVersion } from '@/lib/cache';

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-z0-9_-]+$/i.test(id);
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid meeting id' }, { status: 400 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        attendees: { include: { profile: true } },
        research: true,
        brief: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, data: meeting },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Error fetching meeting:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Failed to fetch meeting' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting for mutations
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
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid meeting id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = meetingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const details = formatZodError(parsed.error);
      return NextResponse.json({ success: false, error: `Validation failed: ${details}` }, { status: 400 });
    }

    const data = parsed.data;

    // Sanitize string fields
    const sanitized: Record<string, unknown> = {};
    if (data.title !== undefined) sanitized.title = sanitizeString(data.title, 200);
    if (data.description !== undefined) sanitized.description = sanitizeString(data.description, 2000);
    if (data.agenda !== undefined) sanitized.agenda = sanitizeString(data.agenda, 5000);
    if (data.location !== undefined) sanitized.location = sanitizeString(data.location, 200);
    if (data.meetingUrl !== undefined) {
      const u = sanitizeUrl(data.meetingUrl);
      if (data.meetingUrl && !u) {
        return NextResponse.json(
          { success: false, error: 'Validation failed: meetingUrl: Invalid URL format' },
          { status: 400 }
        );
      }
      sanitized.meetingUrl = u;
    }
    if (data.status !== undefined) sanitized.status = data.status;
    if (data.duration !== undefined) sanitized.duration = data.duration;
    if (data.dateTime !== undefined) {
      const d = new Date(data.dateTime);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Validation failed: dateTime: Invalid dateTime format' },
          { status: 400 }
        );
      }
      sanitized.dateTime = d;
    }

    // Ensure at least one field to update
    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ success: false, error: 'Validation failed: no fields to update' }, { status: 400 });
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: sanitized,
      include: { attendees: true },
    });
    await incrementDataVersion('meeting');

    return NextResponse.json({ success: true, data: meeting });
  } catch (error) {
    console.error('Error updating meeting:', error instanceof Error ? error.message : 'Unknown error');
    // Prisma P2025 = record not found
    if (error instanceof Error && (error as unknown as { code?: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update meeting' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid meeting id' }, { status: 400 });
    }
    await prisma.meeting.delete({ where: { id } });
    await incrementDataVersion('meeting');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && (error as unknown as { code?: string }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to delete meeting' }, { status: 500 });
  }
}
