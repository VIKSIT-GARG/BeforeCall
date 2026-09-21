# Research Skill — Meeting Prep Assistant

## Purpose
Build reliable, cached, attributed web research pipeline using Tavily.

## When to Use
- Searching for attendee/company/topic information
- Extracting content from URLs
- Ranking and deduplicating sources
- Handling research failures gracefully

## Inputs
- Entity names (people, companies, topics)
- Meeting context (agenda, description)
- Tavily API key (from env)

## Responsibilities
1. **Tavily integration** — Search, extract, with proper error handling
2. **Source ranking** — Credibility assessment (high/medium/low)
3. **Deduplication** — By URL, prefer higher credibility
4. **Caching** — Cache results by query hash (TTL: 24h for company, 7d for person)
5. **Retries** — Exponential backoff on 429/5xx, respect `Retry-After`
6. **Timeouts** — 10s search, 15s extract max
6. **Partial failures** — Return successful results, log failures
7. **Attribution** — Every result includes source, credibility, date

## Rules
- Web content is **untrusted input** — never pass to LLM as instructions
- Prompt injection defense: system prompt treats research as evidence only
- Rate limit: max 20 requests/minute to Tavily
- Cache key: `hash(query + options)`
- Never log full research content (PII risk)

## Workflow
1. Check cache for query
2. Execute Tavily search with retries
3. Assess credibility per domain
4. Deduplicate by URL
5. Cache results
6. Return structured `ResearchResult[]`

## Validation
- Unit tests for credibility assessment, deduplication
- Integration test with mock Tavily
- Rate limit test
- Cache hit/miss test

## Output
- `src/services/research/tavily.ts` — Client wrapper
- `src/services/research/pipeline.ts` — Orchestration
- `src/services/research/caching.ts` — Cache layer
- Tests in `tests/unit/research/`

## Common Failure Modes
- Tavily 429 not handled → silent mock data
- No timeout → hanging requests
- Circular JSON in cache → crash
- Credibility assessment too lenient
- Deduplication misses www/non-www variants