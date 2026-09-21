/**
 * Re-export façade for hardened Tavily client.
 * Canonical implementation lives in src/services/research.ts and src/lib/tavily-guardrails.ts.
 * This file exists to satisfy the expected path `src/services/research/tavily-client.ts`
 * so imports like `from '@/services/research/tavily-client'` keep working.
 *
 * SECURITY: web content is UNTRUSTED DATA — see src/lib/tavily-guardrails.ts header.
 */
export { searchWeb, searchCompany, searchPerson, searchTopic } from '@/services/research';
