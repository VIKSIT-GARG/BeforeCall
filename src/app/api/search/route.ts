import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { cache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface SearchResult {
  meetings: Array<{ id: string; title: string; dateTime: string; status: string; hostName: string | null; attendees: Array<{ name: string; company: string | null; role: string | null }> }>;
  people: Array<{ id: string; name: string; role: string | null; company: string | null; meetingId: string; meetingTitle: string }>;
  topics: Array<{ id: string; meetingId: string; meetingTitle: string; snippet: string; dateTime: string }>;
}

function sanitizeLikeInput(q: string): string {
  return q.slice(0, 100);
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(request, 'search');
  if (!rate.allowed) {
    const retryAfterSec = Math.ceil(rate.retryAfterMs / 1000).toString();
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSec,
          'X-RateLimit-Limit': RATE_LIMITS.search.limit.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const raw = request.nextUrl.searchParams.get('q');
  const q = raw?.trim() ?? '';

  if (!q || q.length < 1 || q.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Query must be 1-100 characters' },
      { status: 400 }
    );
  }

  const normalized = sanitizeLikeInput(q);
  const cacheKey = `search:${normalized.toLowerCase()}`;

  try {
    const cached = await cache.get<SearchResult>(cacheKey);
    if (cached) {
      return NextResponse.json(
        { success: true, data: cached },
        {
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.search.limit.toString(),
            'X-RateLimit-Remaining': rate.remaining.toString(),
            'Cache-Control': 'private, max-age=60',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    const meetingsPromise = prisma.meeting.findMany({
      where: {
        title: { contains: normalized },
      },
      orderBy: { dateTime: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        dateTime: true,
        status: true,
        hostName: true,
        attendees: { select: { name: true, company: true, role: true } },
      },
    });

    const peoplePromise = prisma.attendee.findMany({
      where: {
        OR: [
          { name: { contains: normalized } },
          { company: { contains: normalized } },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        role: true,
        company: true,
        meetingId: true,
        meeting: { select: { title: true } },
      },
    });

    const topicsPromise = prisma.meeting.findMany({
      where: {
        OR: [
          { agenda: { contains: normalized } },
          { description: { contains: normalized } },
        ],
      },
      orderBy: { dateTime: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        agenda: true,
        description: true,
        dateTime: true,
      },
    });

    const [meetingsRaw, peopleRaw, topicsRaw] = await Promise.all([meetingsPromise, peoplePromise, topicsPromise]);

    const meetings: SearchResult['meetings'] = meetingsRaw.map(m => ({
      id: m.id,
      title: m.title,
      dateTime: m.dateTime.toISOString(),
      status: m.status,
      hostName: m.hostName,
      attendees: m.attendees,
    }));

    const people: SearchResult['people'] = peopleRaw.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      company: p.company,
      meetingId: p.meetingId,
      meetingTitle: p.meeting.title,
    }));

    const topics: SearchResult['topics'] = topicsRaw.map(m => {
      const source = m.agenda && m.agenda.toLowerCase().includes(normalized.toLowerCase()) ? m.agenda : (m.description || m.agenda || '');
      const snippet = source.length > 120 ? source.slice(0, 120) + '…' : source;
      return {
        id: m.id,
        meetingId: m.id,
        meetingTitle: m.title,
        snippet,
        dateTime: m.dateTime.toISOString(),
      };
    });

    const result: SearchResult = { meetings, people, topics };

    await cache.set(cacheKey, result, 60_000);

    return NextResponse.json(
      { success: true, data: result },
      {
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS.search.limit.toString(),
          'X-RateLimit-Remaining': rate.remaining.toString(),
          'Cache-Control': 'private, max-age=60',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('Search error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
