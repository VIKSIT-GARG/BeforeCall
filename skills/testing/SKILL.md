# Testing Skill — BeforeCall

## Purpose
Build and maintain comprehensive test suite: unit, API, integration, E2E.

## When to Use
- Writing tests for new features
- Fixing failing tests
- Setting up test infrastructure
- CI/CD test configuration

## Test Pyramid
```
Unit (fast, isolated)          → 70%
    ↓ utilities, validators, parsers
API (contract)                 → 20%
    ↓ request/response, validation, errors
Integration (multi-service)    → 8%
    ↓ research pipeline, AI synthesis
E2E (user journeys)            → 2%
    ↓ create meeting → research → brief
```

## Responsibilities
1. **Unit tests** — `src/__tests__/` for utils, types, validators
2. **API tests** — `tests/api/` for all routes
3. **Integration tests** — `tests/integration/` for pipelines
4. **E2E tests** — `tests/e2e/` with Playwright
5. **Mock strategies** — Mock Tavily, Ollama, Prisma
6. **Test data** — Factories for meetings, attendees, research
7. **CI integration** — Run on every PR

## Rules
- No `test.only`/`describe.only` in commits
- No flaky tests — fix or remove
- Mock external services (Tavily, Ollama, Prisma)
- Real DB for integration tests (test SQLite)
- Coverage target: 80% unit, 60% API
- Tests must run in `npm test` without manual setup

## Workflow
1. Write failing test for new behavior
2. Implement feature
3. Run `npm test` — all pass
4. Add to CI if new test file
5. Update coverage thresholds if needed

## Validation
- `npm test` — all pass
- `npm run test:coverage` — meets thresholds
- `npm run test:e2e` — critical paths pass
- No console errors in test output

## Output
- Tests in `src/__tests__/`, `tests/`
- Mock utilities in `tests/mocks/`
- Playwright config in `playwright.config.ts`
- CI workflow in `.github/workflows/`

## Common Failure Modes
- Tests depending on test order
- Real API calls in unit tests
- Missing mocks for Tavily/Ollama
- Database not reset between tests
- E2E tests flaky due to timing
- Coverage thresholds too low