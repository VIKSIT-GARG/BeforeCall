# Database Skill — BeforeCall

## Purpose
Manage Prisma schema, migrations, indexes, and PostgreSQL production deployment.

## When to Use
- Schema changes
- Creating migrations
- Query optimization
- Production database setup
- Seed data

## Inputs
- Current `prisma/schema.prisma`
- Migration history in `prisma/migrations/`
- Query patterns from services

## Responsibilities
1. **Schema design** — Normalized relations, proper types
2. **Migrations** — `prisma migrate dev --name <descriptive>`
3. **Indexes** — `@@index` for query patterns
4. **Constraints** — `@@unique`, foreign keys, cascades
5. **JSON fields** — For flexible research/brief data
6. **Production** — PostgreSQL on Render, connection pooling
7. **Seeding** — `npm run db:seed` for dev/demo data

## Rules
- Never `db push` in production — use migrations
- Migration names: descriptive (`add_attendee_profile_sources`)
- Test migrations: `prisma migrate reset` → `prisma migrate deploy`
- JSON fields: document structure in comments
- Cascade deletes: only where semantically correct
- Timestamps: `createdAt`/`updatedAt` on all models

## Current Schema Highlights
- `Meeting` — core entity, status enum
- `Attendee` + `AttendeeProfile` — research per person
- `Company` + `CompanyResearch` — org intelligence
- `Research` — raw search results per query
- `Brief` — synthesized output (JSON fields)
- `UserSettings` — future auth preparation

## Workflow
1. Modify `schema.prisma`
2. `npm run db:migrate` (creates migration)
3. Review migration SQL
4. `npm run db:push` (local dev only)
5. Run tests
6. Commit migration files

## Validation
- `npm run db:migrate:deploy` on clean DB succeeds
- Tests pass against migrated schema
- Query performance: `EXPLAIN ANALYZE` on critical paths

## Output
- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.ts`

## Common Failure Modes
- Forgetting `@@unique` on business keys
- Missing indexes on foreign keys
- JSON field structure changes without migration
- Cascade delete removing needed data
- SQLite-only behavior (e.g., no enums) in schema