import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runResearchPipeline } from '@/services/pipeline';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-z0-9_-]+$/i.test(id);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting: 10/min per IP for research
  const rate = checkRateLimit(request, 'research');
  if (!rate.allowed) {
    const retryAfterSec = Math.ceil(rate.retryAfterMs / 1000).toString();
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSec,
          'X-RateLimit-Limit': RATE_LIMITS.research.limit.toString(),
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

    // Parse ?refresh bypass for cache (spec task 4)
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === 'true' || url.searchParams.get('refresh') === '1';

    // Concurrency protection: check meeting.status before research
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.status === 'RESEARCHING') {
      return NextResponse.json(
        { success: false, error: 'Research already in progress' },
        { status: 409 }
      );
    }

    // Atomic claim: only transition to RESEARCHING if not already RESEARCHING (race protection)
    const claimed = await prisma.meeting.updateMany({
      where: { id, status: { not: 'RESEARCHING' } },
      data: { status: 'RESEARCHING' },
    });

    if (claimed.count === 0) {
      // Another request won the race
      return NextResponse.json(
        { success: false, error: 'Research already in progress' },
        { status: 409 }
      );
    }

    // Benchmark: meeting creation already done at /api/meetings; log research trigger time
    console.time('api:research:trigger');
    // Run research pipeline asynchronously (pipeline will set COMPLETED or revert to DRAFT on failure)
    // Pass refresh to bypass cache (tavily/github/identity/company 24h)
    const result = await runResearchPipeline(id, undefined, { refresh });
    console.timeEnd('api:research:trigger');

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Research failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error running research:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Failed to run research' }, { status: 500 });
  }
}
