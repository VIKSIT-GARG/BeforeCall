/**
 * Simple semaphore / p-limit for bounded parallelism.
 * Server-only. Concurrency limit 3 per task spec.
 */
import 'server-only';

export function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const acquire = async (): Promise<void> => {
    if (active < concurrency) {
      active++;
      return;
    }
    await new Promise<void>((resolve) => queue.push(resolve));
    active++;
  };

  const release = (): void => {
    active--;
    if (queue.length > 0) {
      const next = queue.shift()!;
      next();
    }
  };

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };

  return { acquire, release, run };
}

/**
 * Execute items with bounded concurrency, collecting results.
 * Preserves order of input (like Promise.all), propagates errors per-item.
 */
export async function boundedMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const limiter = createLimiter(concurrency);
  const results: R[] = new Array(items.length);
  await Promise.all(
    items.map((item, i) =>
      limiter.run(async () => {
        results[i] = await fn(item, i);
      })
    )
  );
  return results;
}
