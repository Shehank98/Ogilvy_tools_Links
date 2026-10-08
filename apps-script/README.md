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

## Troubleshooting: "add the MAIL_SECRET Script property"

1. In the Apps Script editor pick the **`checkSetup`** function and click **Run**, then open **Execution log** (bottom of the editor).
2. It prints the property names it can see, whether `MAIL_SECRET` is readable, and **this project's web app URL**.
3. Compare that URL with `APPS_SCRIPT_URL` on Railway. If they differ, Railway is calling a different project (for example an old copy): update `APPS_SCRIPT_URL` to the URL from the log.
4. If the property name looks different (extra space, wrong case), delete it and add it again as exactly `MAIL_SECRET`.

## Check it works

Open `https://your-site/api/health` and read the **`mailRelay`** line. It tests the relay without sending an email and tells you what to fix:

| `mailRelay` says | Fix |
| --- | --- |
| `ok (...)` | All good. |
| `secret mismatch` | `APPS_SCRIPT_SECRET` (Railway) must exactly equal `MAIL_SECRET` (Apps Script). No spaces or quotes. |
| `Google returned a web page` | Redeploy the Web app with *Who has access: **Anyone***, and use the new `/exec` URL. |
| `isn't authorised to send mail` | In Apps Script run `authorize` once and approve, then **Deploy → Manage deployments → Edit → New version**. |
| `add the MAIL_SECRET Script property` | Project Settings → Script properties. |
| `older Code.gs` | Paste the latest `Code.gs` and deploy a **New version**. |

## Good to know

- **Quota:** ~100 emails/day on a free Google account, ~1,500/day on Google Workspace. Deploy it from a Workspace account, ideally a shared mailbox like `automation@…`, so mail comes from a sensible sender.
- `GET` on the URL returns a status message; use it to check the deployment is live.
