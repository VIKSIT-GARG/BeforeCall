/**
 * Lightweight benchmark helper for pipeline.
 * Records durations via performance.now() and logs via console.time/timeEnd + summary.
 * Server-only.
 */
import 'server-only';

export type BenchmarkRecord = {
  label: string;
  start: number;
  end?: number;
  durationMs?: number;
};

export class Benchmark {
  private records = new Map<string, BenchmarkRecord>();
  private startTotal = Date.now();

  start(label: string): void {
    // also use console.time for spec compliance
    try {
      console.time(`bench:${label}`);
    } catch {}
    this.records.set(label, { label, start: Date.now() });
  }

  end(label: string): number | null {
    const rec = this.records.get(label);
    if (!rec) return null;
    try {
      console.timeEnd(`bench:${label}`);
    } catch {}
    rec.end = Date.now();
    rec.durationMs = rec.end - rec.start;
    return rec.durationMs;
  }

  // Convenience to measure async block
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }

  summary(): Record<string, number> {
    const out: Record<string, number> = {};
    this.records.forEach((v, k) => {
      if (typeof v.durationMs === 'number') out[k] = v.durationMs;
    });
    out.total = Date.now() - this.startTotal;
    return out;
  }

  logSummary(): void {
    const s = this.summary();
    console.info('[benchmark] summary (ms):', JSON.stringify(s));
  }
}
