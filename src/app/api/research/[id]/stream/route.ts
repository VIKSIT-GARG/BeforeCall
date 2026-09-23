import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runResearchPipeline } from '@/services/pipeline';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-z0-9_-]+$/i.test(id);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidId(id)) {
    return new Response(JSON.stringify({ type: 'error', message: 'Invalid meeting id' }) + '\n', {
      status: 400,
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }

  // Rate limiting
  const rate = checkRateLimit(request, 'research');
  if (!rate.allowed) {
    return new Response(JSON.stringify({ type: 'error', message: 'Too many requests' }) + '\n', {
      status: 429,
      headers: { 'Content-Type': 'application/x-ndjson', 'Retry-After': Math.ceil(rate.retryAfterMs / 1000).toString() },
    });
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') === 'true' || url.searchParams.get('refresh') === '1';

  const meeting = await prisma.meeting.findUnique({ where: { id }, select: { id: true, status: true, updatedAt: true } });
  if (!meeting) {
    return new Response(JSON.stringify({ type: 'error', message: 'Meeting not found' }) + '\n', {
      status: 404,
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }

  // If already researching and updated within the last 60 seconds, prevent duplicate pipeline
  const isStale = Date.now() - new Date(meeting.updatedAt).getTime() > 60_000;
  if (meeting.status === 'RESEARCHING' && !refresh && !isStale) {
    const stream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode(JSON.stringify({ type: 'stage', stage: 'RESEARCH_RUNNING', status: 'running', message: 'Research already in progress' }) + '\n'));
        controller.enqueue(enc.encode(JSON.stringify({ type: 'error', message: 'Research already in progress' }) + '\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'X-RateLimit-Limit': RATE_LIMITS.research.limit.toString(),
      },
    });
  }

  // Claim
  await prisma.meeting.update({
    where: { id },
    data: { status: 'RESEARCHING' },
  });

  // Streaming pipeline
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        } catch {}
      };

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n'));
        } catch {}
      }, 15000);

      try {
        // Directly run pipeline with onEvent forwarding
        const result = await runResearchPipeline(id, undefined, {
          refresh,
          onEvent: (e) => send(e),
        });

        if (!result.success) {
          send({ type: 'error', message: result.error || 'Research failed' });
        }
      } catch (e: any) {
        send({ type: 'error', message: e?.message || 'Research failed' });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-RateLimit-Limit': RATE_LIMITS.research.limit.toString(),
      'X-Accel-Buffering': 'no',
    },
  });
}

// Keep POST for backwards compat (non-streaming)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // delegate to GET logic with same refresh handling but non-stream response
  const url = new URL(request.url);
  url.pathname = `/api/research/${id}/stream`;
  // Instead of redirect, just run pipeline non-stream and return JSON (existing behavior)
  const { runResearchPipeline: run } = await import('@/services/pipeline');
  const meeting = await prisma.meeting.findUnique({ where: { id }, select: { status: true } });
  if (!meeting) return new Response(JSON.stringify({ success: false, error: 'Meeting not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (meeting.status === 'RESEARCHING') return new Response(JSON.stringify({ success: false, error: 'Research already in progress' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  const claimed = await prisma.meeting.updateMany({ where: { id, status: { not: 'RESEARCHING' } }, data: { status: 'RESEARCHING' } });
  if (claimed.count === 0) return new Response(JSON.stringify({ success: false, error: 'Research already in progress' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  const refresh = url.searchParams.get('refresh') === 'true';
  const result = await run(id, undefined, { refresh });
  if (!result.success) return new Response(JSON.stringify({ success: false, error: result.error }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
}