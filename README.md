# Tools Hub

Internal portal for discovering and launching company tools, browsing workshop schedules, reading tips & tricks / newsletters, and requesting new tools.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM
- Deploy target: Railway

## Staff sign-in, reports and ticket tracking

The whole hub sits behind a staff login (switch it off with `FEATURES.userLogin` in `src/lib/features.ts`).

- **Create account:** name + `@ogilvy.com` email + password → a 6-digit code is emailed (15 min, 5 tries) → verified and signed in. Password reset uses the same code flow. Passwords are scrypt-hashed, sessions are random tokens stored hashed in an `httpOnly` cookie, and sign-in/code requests are rate-limited.
- **Tools:** a clean grid of tool tiles (logo and name; click to open) plus Coming Soon cards, notices and the per-card feedback button, tied to the signed-in user. Every screen fits the window: the page itself never scrolls, only the content area does when there is more than fits.
- **Report to us:** `/report`, a bug / suggestion / idea form (tool, priority, title, details, steps).
- **My Tickets:** `/tickets`, live progress (Received → In review → Planned → Done), the team's notes and full history. Anything a user sends from a card's 💡 button shows up here too.
- **Admin:** the existing Feedback inbox now shows ticket numbers and reporters, takes a *note to requester*, keeps a history and can email the requester on each update. Internal notes stay private.
- **Reports:** *Admin → Feedback* is a tickets console with KPIs (open, resolved, resolution rate, average time to resolve, bugs fixed), a status breakdown and filters (date range with quick presets, type, status, priority, tool, search). **Excel report** and **PDF report** buttons export exactly what is on screen for the chosen date range. The date can mean *date raised*, *date resolved/fixed* or *last updated*. The workbook has Summary, Tickets, Bug fixes, Open bugs and Ticket history sheets; the PDF has a summary page plus bug-fixing details, open bugs and all tickets. Times are UTC. The PDF uses a built-in font, so emoji and non-Latin scripts print as `?` (Excel shows them correctly).
- **Email** goes through a small Google Apps Script relay, see [`apps-script/README.md`](apps-script/README.md). Without `APPS_SCRIPT_URL` / `APPS_SCRIPT_SECRET`, local dev prints emails to the console.

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
| `SESSION_SECRET` | Secret used to sign the admin session cookie and hash email codes |
| `APPS_SCRIPT_URL` | Web app URL of the mail relay (`apps-script/Code.gs`) |
| `APPS_SCRIPT_SECRET` | Shared secret, same as `MAIL_SECRET` in the Apps Script |
| `ALLOWED_EMAIL_DOMAINS` | *(optional)* comma-separated domains allowed to sign up, default `ogilvy.com` |
| `ADMIN_NOTIFY_EMAIL` | *(optional)* receives an email for every new ticket |
| `APP_URL` | *(optional)* public URL, used for links in emails |

## Railway deployment

1. Create a Postgres service; Railway exposes `DATABASE_URL`.
2. Create a service from this repo, set `ADMIN_PASSWORD` and `SESSION_SECRET`, and reference `DATABASE_URL` from the Postgres service.
3. Deploy the mail relay (`apps-script/README.md`) and set `APPS_SCRIPT_URL` and `APPS_SCRIPT_SECRET`.
4. Migrations run automatically: `npm start` first runs `scripts/migrate.mjs`, which applies pending Prisma migrations and **never stops the app from starting**.
   - If the database was created without Prisma's migration history (e.g. with `prisma db push`, error `P3005`), the script checks that it matches `prisma/baseline.prisma` (the schema before accounts/tickets were added). If it does, it records the original migrations as applied and then applies the new one. Existing data is untouched.
   - If the database doesn't match, nothing is changed. The log says so, and `/api/health` reports `FAILED: database is behind the code`.
   - If a page ever shows "Something went wrong", open `/api/health` first.
