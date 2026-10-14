# Login Service (Google Apps Script)

A small login backend you can plug into **any** website or app. Your Google Sheet is the database, your Google account sends the emails, and nothing needs hosting.

- Sign up with a company email + password → **6-digit code by email** → verified
- Sign in, sign out, "who am I?" (session token)
- **Forgot password** → code by email → new password (signs out every device)
- **Account settings**: change password, change name, sign out on all devices
- Every rule is a **setting** you can edit without touching code
- Audit log of sign-ins, failures and resets (never stores passwords, codes or tokens)

| File | What it is |
| --- | --- |
| `Code.gs` | The service. Paste into Apps Script. |
| `login-client.js` | Tiny JavaScript client (browser or Node), no dependencies. |
| `demo.html` | A complete working login/sign-up/forgot/settings page using the client. Copy its look and behaviour. |
| `dev-server.js` | Runs the real `Code.gs` on your laptop, prints emails to the terminal. No Google account needed. |
| `test-harness.js` | `node test-harness.js` runs 51 automated checks against `Code.gs`. |
| `host-server-example.js` | How a server-side system checks a token with the service. |

Full integration guide / AI prompt: [`docs/IMPLEMENT-LOGIN-IN-ANOTHER-SYSTEM.md`](../../docs/IMPLEMENT-LOGIN-IN-ANOTHER-SYSTEM.md).

## Try it locally first (2 minutes)

```bash
cd apps-script/login-service
node dev-server.js          # then open http://localhost:8787/demo.html
```

Create an account; the 6-digit code is printed in the terminal. Data is in memory only.

## Deploy for real (about 10 minutes)

1. Create a new **Google Sheet** (name it e.g. *Login Service*). Use the Google account that should send the emails, ideally a shared mailbox such as `no-reply@yourcompany.com`.
2. **Extensions → Apps Script.** Replace the default file with the contents of `Code.gs`. Save.
3. Choose the function **`setup`** and **Run**. Approve the permissions (Sheets + sending email). It creates the sheets `Users`, `Codes`, `Sessions`, `AuthLog`, a private secret, and writes every setting (with its default) into Script properties.
4. **Project Settings (⚙️) → Script properties**: edit the settings you want (table below). At minimum set `APP_NAME` and `ALLOWED_DOMAINS`.
5. Choose **`sendTestEmail`** and **Run**. A sample code email arrives in your own inbox (check spam). That proves real delivery.
6. **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access* **Anyone**. Copy the **Web app URL** (ends in `/exec`).
   "Anyone" only means anyone can reach the URL; every action still needs a valid code, password or token.
7. Check it: open `<your URL>?action=config` in a browser. You should see your settings as JSON.
8. Put the URL into your website (`login-client.js` → `createAuthClient({ apiUrl })`).

After changing `Code.gs`, use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. Changing a *setting* needs no redeploy.

## Settings (Script properties)

| Property | Default | Meaning |
| --- | --- | --- |
| `APP_NAME` | `My App` | Shown in emails and in `config` |
| `SENDER_NAME` | *(APP_NAME)* | "From" name on emails |
| `ALLOWED_DOMAINS` | `ogilvy.com` | Who may sign up: comma-separated domains, or `*` for anyone |
| `CODE_TTL_MIN` | `15` | Minutes a code stays valid |
| `CODE_MAX_TRIES` | `5` | Wrong guesses before a code is destroyed |
| `CODES_PER_HOUR` | `5` | Code emails per address, per purpose, per hour |
| `LOGIN_MAX_FAILS` | `8` | Wrong passwords before a temporary lock |
| `LOCK_MINUTES` | `15` | Length of that lock |
| `SESSION_DAYS` | `7` | How long a sign-in lasts |
| `MIN_PASSWORD` | `6` | Shortest password |
| `PASSWORD_NEEDS_MIXED` | `true` | Require a letter **and** a number |
| `PW_ROUNDS` | `1000` | Password hashing rounds (higher = slower and stronger) |
| `LOG_ROWS` | `2000` | Audit-log rows to keep |
| `NOTIFY_PASSWORD_CHANGE` | `true` | Email the user when their password changes |
| `SHEET_ID` | *(this sheet)* | Optional: store data in a different spreadsheet |
| `SECRET` | *(auto)* | Private pepper for hashing. **Never share or change** (changing it invalidates all passwords) |

`showSettings()` prints the values in force. `cleanUp()` removes expired codes and sessions on demand.

## API (one-page summary)

`POST <URL>` with a **text body containing JSON** (no special headers, which avoids a CORS preflight). Every reply is `{ "ok": true, ... }` or `{ "ok": false, "error": "text safe to show", "code": "" | "AUTH" | "UNVERIFIED" | "LOCKED" }`.

| action | send | on success |
| --- | --- | --- |
| `config` | – | app name, allowed domains, password rules, code length/TTL |
| `register` | `name, email, password` | `message`, `next: "verify"` (a code was emailed) |
| `verify` | `email, code` | `token, user{email,name}, expiresInDays` (signed in) |
| `resend` | `email` | `message` (always the same reply) |
| `login` | `email, password` | `token, user, expiresInDays` (`UNVERIFIED` re-sends a code) |
| `me` | `token` | `user, expiresAt` (`AUTH` if invalid/expired) |
| `logout` | `token` | – |
| `logoutAll` | `token` | `revoked` |
| `requestReset` | `email` | `message`, `next: "reset"` (always the same reply) |
| `resetPassword` | `email, code, password` | `message` (all sessions revoked) |
| `changePassword` | `token, currentPassword, newPassword` | `message` (other devices signed out) |
| `updateProfile` | `token, name` | `user` |

## Limits to know

- **Email quota:** a free Google account can send about 100 emails/day, Workspace about 1,500/day. Each sign-up uses 1, each reset 2 (code + "password changed" notice).
- **Speed:** every call takes roughly 0.5-2 s. A server that checks a token on every request should cache the result for ~60 s (see `host-server-example.js`).
- **Password hashing:** Apps Script has no bcrypt, so passwords are salted, iterated SHA-256 with a server-side secret. Good for internal tools; for a public product with millions of users use a dedicated identity provider.
- **Your Sheet holds personal data** (names, emails, password hashes). Share it only with administrators.
