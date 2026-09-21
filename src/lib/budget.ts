/**
 * Budget tracker — server-only.
 * Enforces caps: max 3 Tavily queries/attendee (guarded via tavily-guardrails),
 * max 30 total Tavily queries/pipeline, max 60 GitHub repos, max 5k LLM context.
 */
import 'server-only';
import { TAVILY_TOTAL_CONTEXT_MAX_CHARS } from '@/lib/tavily-guardrails';

export const BUDGET = {
  MAX_TAVILY_QUERIES_PER_ATTENDEE: 3,
  MAX_TOTAL_TAVILY_QUERIES: 30,
  MAX_GITHUB_REPOS: 60,
  MAX_LLM_CONTEXT_CHARS: TAVILY_TOTAL_CONTEXT_MAX_CHARS, // 5k
} as const;

class BudgetTracker {
  private tavilyQueries = 0;
  private githubRepos = 0;

  canMakeTavilyQuery(count = 1): boolean {
    return this.tavilyQueries + count <= BUDGET.MAX_TOTAL_TAVILY_QUERIES;
  }

  recordTavilyQuery(count = 1): void {
    this.tavilyQueries += count;
  }

  tryConsumeTavily(count = 1): boolean {
    if (!this.canMakeTavilyQuery(count)) return false;
    this.tavilyQueries += count;
    return true;
  }

  getTavilyCount(): number {
    return this.tavilyQueries;
  }

  // GitHub: caps repos fetched (60 via per_page)
  recordGithubRepos(count: number): void {
    this.githubRepos += Math.min(count, BUDGET.MAX_GITHUB_REPOS);
  }

  getGithubRepos(): number {
    return this.githubRepos;
  }

  reset(): void {
    this.tavilyQueries = 0;
    this.githubRepos = 0;
  }

  snapshot(): { tavilyQueries: number; githubRepos: number; budget: typeof BUDGET } {
    return { tavilyQueries: this.tavilyQueries, githubRepos: this.githubRepos, budget: BUDGET };
  }
}

export const globalBudget = new BudgetTracker();

export function createBudget(): BudgetTracker {
  return new BudgetTracker();
}

export type { BudgetTracker };
