# Tools Hub

Internal portal for discovering and launching company tools, browsing workshop schedules, reading tips & tricks / newsletters, and requesting new tools.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM
- Deploy target: Railway

## Staff sign-in, reports and ticket tracking

The whole hub sits behind a staff login (switch it off with `FEATURES.userLogin` in `src/lib/features.ts`).

- **Passwords:** every password box has an eye button to show or hide what you typed.
- **Create account:** name + `@ogilvy.com` email + password → a 6-digit code is emailed (15 min, 5 tries) → verified and signed in. Password reset uses the same code flow. Passwords are scrypt-hashed, sessions are random tokens stored hashed in an `httpOnly` cookie, and sign-in/code requests are rate-limited.
- **Tools:** a clean grid of tool tiles (logo and name; click to open) plus simple Coming Soon cards (banner and name), notices and the per-card feedback button, tied to the signed-in user. Every screen fits the window: the page itself never scrolls, only the content area does when there is more than fits.
- **Report to us:** `/report`, a bug / suggestion / idea form (tool, priority, title, details, steps).
- **My Tickets:** `/tickets`, live progress (Received → In review → Work in progress → Done), the team's notes and full history. Anything a user sends from a card's 💡 button shows up here too.
- **Assigning:** on a ticket, *Update ticket → Assign to* opens a checklist of team members (edit `src/lib/team.ts` to change the list). Tick one or several people; it is recorded in the ticket history, shown to the requester as "Handled by", included in the email, filterable in the console and in the Excel/PDF reports (with a workload-by-person table).
- **Admin:** the existing Feedback inbox now shows ticket numbers and reporters, takes a *note to requester*, keeps a history and can email the requester on each update. Internal notes stay private.
- **Reports:** *Admin → Dashboard* shows the same feedback overview (KPIs, status, workload by person, latest tickets); *Admin → Feedback* is the full tickets console with KPIs (open, resolved, resolution rate, average time to resolve, bugs fixed), a status breakdown and filters (date range with quick presets, type, status, priority, tool, search). **Excel report** and **PDF report** buttons export exactly what is on screen for the chosen date range. The date can mean *date raised*, *date resolved/fixed* or *last updated*. The workbook has Summary, Tickets, Bug fixes, Open bugs and Ticket history sheets; the PDF has a summary page plus bug-fixing details, open bugs and all tickets. Times are UTC. The PDF uses a built-in font, so emoji and non-Latin scripts print as `?` (Excel shows them correctly).
- **Attachments:** the report form lets staff attach screenshots and files (up to 5 files, 10 MB each, 25 MB in total: images, PDF, Office files, text/CSV/JSON, ZIP, short videos; SVG/HTML/executables are refused and file contents are checked, not just names). Files are saved to **Firebase Storage** under `tickets/<TICKET-NO>/` (e.g. `tickets/TH-0031/`). Admins see them on the ticket page (thumbnails for images, download for the rest) through a sign-in-protected route, so there are no public links. **When a ticket is set to Done or Closed the files are deleted from storage automatically** (and when a ticket is deleted); the ticket keeps a note that they were removed. See *Firebase Storage setup* below.
- **Assignment emails:** assigning a ticket emails each newly assigned person (addresses in `src/lib/team.ts`) with the ticket details, the requester, the attachment count and an *Open ticket* link; replying goes to the requester. There is a tick-box to switch this off per save.
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

## Firebase Storage setup (ticket attachments)

1. In the [Firebase console](https://console.firebase.google.com) open (or create) a project → **Build → Storage → Get started**. Note the bucket name shown at the top of *Files* (for example `my-app.firebasestorage.app`). Firebase may ask you to enable the pay-as-you-go (Blaze) plan to create a bucket; there is a free monthly allowance and, because files are deleted when tickets are resolved, usage stays tiny.
2. **Project settings → Service accounts → Generate new private key.** A `.json` file downloads. Keep it secret.
3. In Railway add:
   - `FIREBASE_STORAGE_BUCKET` = the bucket name (no `gs://`)
   - `FIREBASE_SERVICE_ACCOUNT` = the entire contents of that `.json` file (or `FIREBASE_SERVICE_ACCOUNT_BASE64` = the same file base64-encoded)
   - `CRON_SECRET` = a long random string
   - `APP_URL` = your site's public address (used for the *Open ticket* link in assignment emails)
4. Redeploy and open `/api/health`: the **`fileStorage`** line should say `ok (Firebase bucket …)`. If not, it says what to fix.
5. Keep the bucket private (the default). The app reads files with its own credentials; you do not need to change Storage security rules, because staff never talk to Firebase directly.

### Automatic clean-up and the safety net

Files are removed the moment a ticket becomes **Done** or **Closed**. If storage was unreachable at that moment, the files stay flagged and a sweep removes them later. Schedule the sweep (for example daily) with a Railway cron service or any scheduler:

```
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR-SITE/api/cron/purge-files
```

It returns `{"ok":true,"tickets":N,"removed":N,"failed":0}`. As an extra backstop you can also add a Storage lifecycle rule that deletes objects under `tickets/` older than, say, 90 days.
