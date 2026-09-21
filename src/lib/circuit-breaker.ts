/**
 * Simple circuit breaker for Tavily — server-only.
 * After 3 consecutive failures, opens for 60s (skip Tavily, use cache/known).
 */
import 'server-only';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  openMs?: number;
}

export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private readonly threshold: number;
  private readonly openMs: number;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.failureThreshold ?? 3;
    this.openMs = opts.openMs ?? 60_000;
  }

  isOpen(): boolean {
    return Date.now() < this.openUntil;
  }

  canExecute(): boolean {
    return !this.isOpen();
  }

  recordSuccess(): void {
    this.failures = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openUntil = Date.now() + this.openMs;
    }
  }

  getState(): { failures: number; openUntil: number; isOpen: boolean } {
    return { failures: this.failures, openUntil: this.openUntil, isOpen: this.isOpen() };
  }

  reset(): void {
    this.failures = 0;
    this.openUntil = 0;
  }
}

// Singleton for Tavily (shared across process)
export const tavilyCircuitBreaker = new CircuitBreaker({ failureThreshold: 3, openMs: 60_000 });
