import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProviderName } from '@/services/ai/providers';
import { NvidiaProvider } from '@/services/ai/providers/nvidia';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  let dbStatus: 'connected'|'disconnected' = 'connected';
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('Health check failed:', error);
    dbStatus = 'disconnected';
    dbError = error instanceof Error
      ? error.message.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@')
      : 'Unknown DB error';
  }

  const providerName = getProviderName();
  // LLM health — server-side only, never expose key
  let llm: any = { provider: providerName, model: process.env.NVIDIA_MODEL || process.env.PRODUCTION_LLM_MODEL || process.env.OLLAMA_MODEL || 'unknown', status: 'unknown' };

  if (providerName === 'mock') {
    llm = { provider: 'mock', model: 'mock', status: 'healthy', latencyMs: 0 };
  } else {
    try {
      const provider = new NvidiaProvider();
      const check = await provider.healthCheck();
      llm = check;
    } catch (e:any) {
      llm = { provider: 'nvidia', model: process.env.NVIDIA_MODEL || process.env.PRODUCTION_LLM_MODEL || 'unknown', status: 'unhealthy', error: e.message?.slice(0,120) };
    }
  }

  const isHealthy = dbStatus === 'connected' && llm.status === 'healthy';
  const status = isHealthy ? 'ok' : (dbStatus === 'disconnected' ? 'degraded' : 'ok');

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    database: dbStatus,
    databaseError: dbError ?? undefined,
    llm,
    environment: process.env.NODE_ENV || 'development',
    latencyMs: Date.now() - started,
  }, { status: dbStatus === 'disconnected' ? 503 : 200 });
}
