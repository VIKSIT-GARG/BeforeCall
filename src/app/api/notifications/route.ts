import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['research_complete', 'research_failed', 'meeting_reminder', 'brief_updated', 'needs_confirmation'] as const;

const createSchema = z.object({
  type: z.enum(ALLOWED_TYPES),
  title: z.string().trim().min(1, 'title required').max(200, 'title max 200'),
  message: z.string().trim().min(1, 'message required').max(1000, 'message max 1000'),
  meetingId: z.string().min(1).max(128).optional(),
});

function isInternalRequest(request: NextRequest): boolean {
  // Internal-only: allow if header x-internal-secret matches env or if same-origin
  // For now, allow POST but validate type/title/message strictly.
  // If INTERNAL_API_SECRET is set, enforce it; otherwise allow internal calls without secret (single-user demo).
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return true;
  const provided = request.headers.get('x-internal-secret') || request.headers.get('x-api-key');
  return provided === secret;
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(request, 'notifications');
  if (!rate.allowed) {
    const retryAfterSec = Math.ceil(rate.retryAfterMs / 1000).toString();
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSec,
          'X-RateLimit-Limit': RATE_LIMITS.notifications.limit.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        read: true,
        meetingId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: notifications },
      {
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS.notifications.limit.toString(),
          'X-RateLimit-Remaining': rate.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Notifications GET error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden: internal only' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ success: false, error: `Validation failed: ${details}` }, { status: 400 });
  }

  const { type, title, message, meetingId } = parsed.data;

  try {
    if (meetingId) {
      const exists = await prisma.meeting.findUnique({ where: { id: meetingId }, select: { id: true } });
      if (!exists) {
        return NextResponse.json({ success: false, error: 'Meeting not found for meetingId' }, { status: 404 });
      }
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title: title.trim().slice(0, 200),
        message: message.trim().slice(0, 1000),
        meetingId: meetingId || null,
      },
    });

    return NextResponse.json({ success: true, data: notification }, { status: 201 });
  } catch (error) {
    console.error('Notifications POST error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const result = await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    console.error('Notifications PATCH error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Failed to mark notifications read' }, { status: 500 });
  }
}
