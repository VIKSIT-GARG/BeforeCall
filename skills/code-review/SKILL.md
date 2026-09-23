# Code Review Skill — BeforeCall

## Purpose
Ruthless code review focusing on correctness, security, architecture, and maintainability.

## When to Use
- Every PR
- Pre-merge validation
- Architecture changes
- Security-sensitive code

## Review Checklist

### Correctness (P0)
- Does it solve the stated problem?
- Edge cases handled (empty, null, huge, duplicate)
- No logic errors in algorithms
- Async/await correct (no fire-and-forget)
- Transactions where needed
- Idempotency for mutations

### Security (P0)
- No secrets in code
- Input validation on ALL boundaries
- No XSS vectors
- No SSRF (arbitrary URL fetch)
- Prompt injection defense in LLM prompts
- Rate limiting on expensive endpoints
- AuthZ checks (ownership, roles)
- Parameterized queries (Prisma handles)

### Architecture (P1)
- Follows established patterns
- No circular dependencies
- Service layer separation (no DB in components)
- Provider abstraction for external services
- No God classes/functions
- SOLID principles

### Performance (P1)
- No N+1 queries
- Appropriate caching
- No blocking operations in render path
- Bundle size impact considered
- Database indexes for new queries

### Maintainability (P2)
- Clear naming (no abbreviations)
- Functions under 50 lines
- Files under 300 lines
- Types exported from types/
- No any without justification
- Comments for "why", not "what"

### Testing (P1)
- Unit tests for new logic
- API tests for new endpoints
- Integration test for pipelines
- No test-only code in production
- Mocks realistic

### Scope (P2)
- PR does one thing
- No drive-by refactors
- No unrelated formatting changes
- Migration included for schema changes

## Severity Levels
| Level | Description | Action |
|-------|-------------|--------|
| P0 | Blocks deployment / Security vuln / Data loss | Must fix before merge |
| P1 | Significant bug / Architecture violation / Perf regression | Fix before merge or follow-up ticket |
| P2 | Maintainability / Style / Minor improvement | Fix or follow-up ticket |
| P3 | Polish / Nice to have | Optional |

## Workflow
1. Read PR description and linked issue
2. Review changed files in order: types -> services -> API -> components
3. Run npm run check locally if needed
4. Comment with severity and reproduction steps
5. Approve only when P0/P1 resolved

## Red Team Questions
- What happens if Tavily returns 429?
- What if LLM returns malformed JSON?
- What if two users research same meeting?
- What if attendee name has XSS payload?
- What if database is down?
- What if research takes 60 seconds?

## Output
- PR review with categorized findings
- Must-fix items clearly marked
- Approve / Request Changes

## Common Failure Modes
- Approving without running tests
- Missing prompt injection in LLM prompts
- Not checking rate limits
- Drive-by refactors increasing scope
- Missing migration for schema change
- any types spreading