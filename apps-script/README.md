# Mail relay (Google Apps Script)

The Tools Hub needs to send email (sign-up codes, ticket confirmations, status updates). Instead of SMTP credentials, it posts to this small Apps Script, which sends the mail from your Google account. Everything else (users, tickets, tools) lives in the app's Postgres database.

## Setup (about 5 minutes)

1. Go to <https://script.google.com> → **New project**. Paste `Code.gs` over the default file.
2. Select the `authorize` function → **Run** → approve the permission to send email.
3. **Project Settings → Script properties**, add:

   | Property | Value |
   | --- | --- |
   | `MAIL_SECRET` | a long random string (the same value goes into Railway) |
   | `ALLOWED_DOMAINS` | *(optional)* defaults to `ogilvy.com` |
   | `SENDER_NAME` | *(optional)* defaults to "Ogilvy Tools Hub" |

4. **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access* **Anyone**. Copy the `/exec` URL.
   (Anyone can reach the URL, but without `MAIL_SECRET` every request is rejected, and mail can only go to allowed-domain addresses.)
5. In Railway (or `.env` locally) set:

   ```
   APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec
   APPS_SCRIPT_SECRET=<the same MAIL_SECRET>
   ```

After editing `Code.gs`, use **Deploy → Manage deployments → Edit → New version** so the URL serves the new code.

## Good to know

- **Quota:** ~100 emails/day on a free Google account, ~1,500/day on Google Workspace. Deploy it from a Workspace account, ideally a shared mailbox like `automation@…`, so mail comes from a sensible sender.
- `GET` on the URL returns a status message; use it to check the deployment is live.
