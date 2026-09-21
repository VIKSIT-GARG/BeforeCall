# Render Deployment Skill — Meeting Prep Assistant

## Purpose
Configure and troubleshoot production deployment to Render.

## When to Use
- Initial Render setup
- Deployment failures
- Environment configuration
- Database migrations
- Worker configuration

## Architecture
```
Render Web Service (Next.js)
    │
    ├── Build: npm ci && npm run build
    ├── Start: npm start
    ├── Health Check: GET /api/health
    │
    ├── Environment Variables (Render Dashboard)
    │   ├── DATABASE_URL (Render PostgreSQL)
    │   ├── TAVILY_API_KEY
    │   ├── LLM_PROVIDER=production
    │   ├── PRODUCTION_LLM_API_KEY
    │   ├── PRODUCTION_LLM_MODEL
    │   ├── NEXT_PUBLIC_APP_URL
    │   └── AUTH_SECRET (when auth added)
    │
    └── Render PostgreSQL (Managed)
        └── Prisma migrations on deploy
```

## render.yaml (Reference)
```yaml
services:
  - type: web
    name: meeting-prep-assistant
    runtime: node
    plan: starter
    buildCommand: npm ci && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: meeting-prep-db
          property: connectionString
      - key: TAVILY_API_KEY
        sync: false
      - key: LLM_PROVIDER
        value: production
      - key: PRODUCTION_LLM_API_KEY
        sync: false
      - key: PRODUCTION_LLM_MODEL
        value: gpt-4o-mini
      - key: NEXT_PUBLIC_APP_URL
        value: https://meeting-prep-assistant.onrender.com

databases:
  - name: meeting-prep-db
    databaseName: meeting_prep
    user: meeting_prep_user
    plan: starter
```

## Responsibilities
1. **Build configuration** — Correct Node version, build command
2. **Environment variables** — All secrets in Render dashboard
3. **Database** — Render PostgreSQL, migrations on deploy
4. **Health endpoint** — `/api/health` returns service status
5. **Worker (optional)** — Background jobs if research >30s
6. **Rollback** — Render automatic rollback on failed deploy

## Database Migrations
- **Dev:** `npm run db:migrate`
- **Prod:** `prisma migrate deploy` in build or separate step
- **Never** `db push` in production
- Test: `docker run postgres` → `prisma migrate deploy`

## Troubleshooting
| Issue | Solution |
|-------|----------|
| Build fails | Check Node version, `npm ci` cache |
| Migration fails | Check SQL, run locally first |
| DB connection fails | Verify `DATABASE_URL` format |
| Health check fails | Implement `/api/health` |
| Worker timeout | Increase timeout or optimize |
| LLM failures | Check provider API key, model name |

## Validation
- Deploy to Render staging
- Run smoke test: create meeting → research → brief
- Verify health endpoint
- Check logs for errors
- Test rate limits

## Output
- `render.yaml` (reference, not committed with secrets)
- `src/app/api/health/route.ts`
- Updated `package.json` scripts
- Deployment documentation in README

## Common Failure Modes
- `prisma generate` not in `postinstall`
- Missing `DATABASE_URL` in Render env
- Build command wrong (missing `npm ci`)
- Health check path incorrect
- LLM provider not configured for production