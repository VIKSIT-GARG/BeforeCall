# Backend Skill — BeforeCall

## Purpose
Build robust, validated, secure API routes and server actions with proper error handling.

## When to Use
- Creating API routes (`src/app/api/`)
- Server actions
- Database operations via Prisma
- Input validation
- Rate limiting
- Authorization

## Inputs
- Prisma schema
- Zod validation schemas (`src/lib/validations/`)
- Domain service interfaces

## Responsibilities
1. **Validate every request** — Zod schema on all inputs
2. **Never trust request body** — Validate before processing
3. **Proper error responses** — Standardized error format, no stack traces
4. **Rate limiting** — Protect expensive endpoints (research, export, create)
5. **Authorization** — Check ownership before data access (when auth added)
6. **Idempotency** — Support idempotency keys for mutations
7. **Transaction boundaries** — Use Prisma `$transaction` for multi-write operations

## Rules
- All API routes in `src/app/api/` follow REST conventions
- Server actions for form submissions, API routes for external consumers
- Standardized response format:
```typescript
{ success: true, data: T } | { success: false, error: string, code?: string }
```
- HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 422, 429, 500
- No `console.log` in production code — use structured logging
- Input size limits on all endpoints

## Workflow
1. Define Zod schema in `src/lib/validations/`
2. Create API route with validation middleware
3. Call domain service
4. Return standardized response
4. Add integration test

## Validation
- `npm run typecheck` — passes
- `npm run lint` — passes
- API tests in `tests/api/` pass
- Manual test with invalid inputs

## Output
- API routes in `src/app/api/`
- Validation schemas in `src/lib/validations/`
- Tests in `tests/api/`

## Common Failure Modes
- Missing validation on nested objects
- Not handling Prisma P2003 (FK violation) errors
- Returning 500 for validation errors
- No rate limiting on expensive endpoints
- Exposing internal errors to client