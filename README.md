# Tools Hub

Internal portal for discovering and launching company tools, browsing workshop schedules, reading tips & tricks / newsletters, and requesting new tools.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM
- Deploy target: Railway

## Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
npx prisma migrate deploy
npm run dev
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (provided by Railway Postgres) |
| `ADMIN_PASSWORD` | Shared password for the `/admin` section |
| `SESSION_SECRET` | Secret used to sign the admin session cookie |

## Railway deployment

1. Create a Postgres service; Railway exposes `DATABASE_URL`.
2. Create a service from this repo, set `ADMIN_PASSWORD` and `SESSION_SECRET`, and reference `DATABASE_URL` from the Postgres service.
3. Set the pre-deploy (or start) command to run migrations: `npx prisma migrate deploy`.
