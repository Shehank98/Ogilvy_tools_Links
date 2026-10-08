# Ogilvy Automation Desk

A single-screen portal where Ogilvy staff sign in, launch the automation tools, report bugs or suggestions, and track their tickets.

- `index.html` – the whole front end (no build step, host anywhere static)
- `Code.gs` – Google Apps Script backend; a Google Sheet is the database

## What users get

| Tab | What it does |
| --- | --- |
| **Tools** | Compact grid of tools (search + category filter). *Open* launches the tool, *Report* jumps to the report form with that tool pre-selected. |
| **Report** | Bug or Suggestion form: tool, priority, title, details, steps to reproduce. Sends a confirmation email with the ticket ID. |
| **My tickets** | Live list (auto-refreshes every 30s) with a progress bar, status, team notes and full history. |

Sign-up requires an `@ogilvy.com` email + password, then a 6-digit code emailed to that address (valid 15 min, 5 tries). Password reset uses the same code flow. Admins sign in at `#/admin` to move tickets through *New → In Review → In Progress → Testing → Resolved / Declined*, add a note, and optionally email the requester.

## Setup (about 10 minutes)

1. Create a new **Google Sheet** (name it e.g. *Ogilvy Automation Desk*).
2. **Extensions → Apps Script**, replace the default file with the contents of `Code.gs`.
3. Select the `setup` function and **Run**. Approve the permissions (Sheets + sending email). It creates the `Users`, `Codes`, `Sessions`, `Tickets` and `Tools` tabs and adds four sample tools.
4. **Project Settings → Script properties**, add:

   | Property | Value |
   | --- | --- |
   | `ADMIN_USER` | admin username you choose |
   | `ADMIN_PASS` | a long, unique admin password |
   | `ADMIN_EMAIL` | *(optional)* where "new ticket" alerts go |
   | `ALLOWED_DOMAINS` | *(optional)* defaults to `ogilvy.com`; comma-separate for more |

5. **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access* **Anyone**. Copy the `/exec` URL.
   (Access must be *Anyone* so the page can call it; the code itself enforces sign-in on every request.)
6. Open `index.html` and paste the URL into `var API_URL = '...'` near the top of the script.
7. Host `index.html` anywhere (Railway static service, Netlify, GitHub Pages, SharePoint…), or just open it locally to test.

After any change to `Code.gs`, use **Deploy → Manage deployments → Edit → New version** so the `/exec` URL picks it up.

## Managing tools

Edit the **Tools** tab of the Sheet. Changes show up for users within a few minutes (or on their next page load).

| Column | Notes |
| --- | --- |
| `name`, `description` | shown on the card |
| `url` | `https://…` link opened by *Open*. Empty = shown as *Coming soon* |
| `category` | drives the filter chips |
| `icon` | an emoji; falls back to the first letter |
| `status` | `Live`, `Beta` or `Coming Soon` |
| `active` | `TRUE` / `FALSE` to show or hide |
| `order` | lower numbers first |

## Good to know

- **Email limits:** Apps Script `MailApp` allows ~100 emails/day on a free Google account and ~1,500/day on Google Workspace. Run the script from a Workspace account (ideally a shared mailbox such as automation@…) so verification emails come from a sensible sender.
- **Security:** passwords are salted and hashed server-side (never stored in clear text), codes are hashed, sessions are random tokens stored hashed, logins and codes are rate-limited, and user text is stripped of spreadsheet-formula prefixes. The sheet holds personal data, so share it only with the Automation team. Apps Script has no bcrypt, so hashing is iterated SHA-256 with a per-user salt and a server-side secret, which is fine for an internal tool but worth knowing.
- **Brand font:** the page uses Helvetica/Arial. To use the Ogilvy brand font, add an `@font-face` rule and put it first in `--font`.
