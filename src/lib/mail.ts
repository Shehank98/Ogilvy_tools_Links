import { CODE_TTL_MIN } from "@/lib/user-auth";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );

/**
 * Sends mail through the Google Apps Script relay in /apps-script (it uses the
 * Google account's mailbox, so no SMTP credentials are needed). Without the
 * env vars, local development just logs the message to the console.
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[mail:dev] to=${opts.to}\n  ${opts.subject}\n  ${opts.text}\n`);
      return;
    }
    throw new Error("Email relay is not configured (APPS_SCRIPT_URL / APPS_SCRIPT_SECRET).");
  }
  const res = await fetch(url, {
    method: "POST",
    redirect: "follow",
    // text/plain avoids a CORS preflight, which Apps Script cannot answer.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret, ...opts }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!data?.ok) throw new Error(`Mail relay failed: ${data?.error ?? res.status}`);
}

/** Plain-language check of the Apps Script relay, used by /api/health. Sends no email. */
export async function diagnoseRelay(): Promise<string> {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) return "NOT CONFIGURED: set APPS_SCRIPT_URL and APPS_SCRIPT_SECRET.";
  if (/script\.google\.com/.test(url) && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
    return "FAILED: APPS_SCRIPT_URL should look like https://script.google.com/macros/s/…/exec (copy the Web app URL, not the editor link or a /dev URL).";
  }
  const asJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text) as { ok?: boolean; error?: string; quota?: number };
    } catch {
      return null;
    }
  };
  try {
    const get = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    if (!(await asJson(get))) {
      return `FAILED: Google returned a web page (HTTP ${get.status}) instead of the script's reply. Redeploy the Web app with "Execute as: Me" and "Who has access: Anyone", then use the new /exec URL.`;
    }
    const post = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret, ping: true, to: "relay-check@invalid.invalid", subject: "ping", html: "ping" }),
      signal: AbortSignal.timeout(15_000),
    });
    const r = await asJson(post);
    if (!r) return `FAILED: the script answered with something unreadable (HTTP ${post.status}).`;
    if (r.ok) return `ok (secret accepted, mail permission granted, ${r.quota ?? "?"} emails left today)`;
    const err = r.error ?? "";
    if (/unauthorized/i.test(err)) return "FAILED: secret mismatch. APPS_SCRIPT_SECRET must exactly equal the MAIL_SECRET Script property (no spaces or quotes).";
    if (/MAIL_SECRET is not set/i.test(err)) return "FAILED: add the MAIL_SECRET Script property in Apps Script (Project Settings → Script properties).";
    if (/allowed domain/i.test(err)) return "PARTIAL: secret accepted, but this is an older Code.gs. Paste the latest apps-script/Code.gs and deploy a New version to also verify the mail permission.";
    if (/permission|authori/i.test(err)) return `FAILED: the script isn't authorised to send mail. In Apps Script run the "authorize" function once and approve, then deploy a New version. (${err.slice(0, 120)})`;
    return `FAILED: ${err.slice(0, 200)}`;
  } catch (e) {
    return `FAILED: could not reach Google (${e instanceof Error ? e.message : String(e)}).`;
  }
}

function layout(heading: string, body: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1d1d1d">
<div style="border-top:4px solid #ee3124;padding:18px 0 4px"><span style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#ee3124">Ogilvy</span>
<span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6e6e6e;margin-left:8px">Tools Hub</span></div>
<h2 style="margin:14px 0 8px;color:#111">${esc(heading)}</h2>${body}
<p style="border-top:1px solid #e4e4e4;margin-top:24px;padding-top:12px;font-size:12px;color:#6e6e6e">Ogilvy · Automation Team</p></div>`;
}

export async function sendCodeEmail(
  to: string,
  name: string,
  purpose: "VERIFY" | "RESET",
  code: string
): Promise<void> {
  const verify = purpose === "VERIFY";
  const first = name.trim().split(/\s+/)[0] || "there";
  await sendMail({
    to,
    subject: `Your Tools Hub code: ${code}`,
    text: `Your Tools Hub code is ${code}. It is valid for ${CODE_TTL_MIN} minutes.`,
    html: layout(
      verify ? "Verify your email" : "Reset your password",
      `<p>Hi ${esc(first)}, ${
        verify
          ? "use this code to finish creating your Tools Hub account."
          : "use this code to choose a new password."
      }</p><p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:20px 0;color:#111">${code}</p>
<p style="color:#6e6e6e;font-size:13px">The code expires in ${CODE_TTL_MIN} minutes. If you didn't ask for it, you can ignore this email.</p>`
    ),
  });
}

type TicketMail = { code: string; title: string; kind: string; tool: string };

const ticketTable = (t: TicketMail) =>
  `<table style="border-collapse:collapse;margin:14px 0;font-size:14px">${[
    ["Ticket", t.code],
    ["Type", t.kind],
    ["About", t.tool],
    ["Title", t.title],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 16px 3px 0;color:#6e6e6e">${k}</td><td><strong>${esc(v)}</strong></td></tr>`
    )
    .join("")}</table>`;

const link = () => {
  const base = process.env.APP_URL?.replace(/\/$/, "");
  return base
    ? `<p><a href="${esc(base)}/tickets" style="color:#ee3124">Track your tickets →</a></p>`
    : "";
};

export async function sendTicketReceivedEmail(to: string, name: string, t: TicketMail) {
  const first = name.trim().split(/\s+/)[0] || "there";
  await sendMail({
    to,
    subject: `[${t.code}] We received your ${t.kind.toLowerCase()}`,
    text: `Ticket ${t.code} received: ${t.title}`,
    html: layout(
      `Ticket ${t.code} received`,
      `<p>Hi ${esc(first)}, thanks for raising this. The Automation team will review it shortly.</p>${ticketTable(t)}${link()}`
    ),
  });
}

export async function sendTicketUpdateEmail(
  to: string,
  name: string,
  t: TicketMail,
  statusLabel: string,
  note: string | null
) {
  const first = name.trim().split(/\s+/)[0] || "there";
  await sendMail({
    to,
    subject: `[${t.code}] Status: ${statusLabel}`,
    text: `Ticket ${t.code} is now ${statusLabel}.${note ? " " + note : ""}`,
    html: layout(
      `Ticket ${t.code} updated`,
      `<p>Hi ${esc(first)}, your ticket is now <strong>${esc(statusLabel)}</strong>.</p>${
        note
          ? `<p style="background:#f6f6f6;border-left:3px solid #ee3124;padding:10px 14px;white-space:pre-wrap">${esc(note)}</p>`
          : ""
      }${ticketTable(t)}${link()}`
    ),
  });
}

export async function sendAdminNewTicketEmail(
  to: string,
  who: string,
  priority: string,
  t: TicketMail
) {
  await sendMail({
    to,
    subject: `[${t.code}] New ${t.kind.toLowerCase()} from ${who}`,
    text: `${who} raised ${t.code}: ${t.title} (${priority} priority)`,
    html: layout(
      `New ${t.kind.toLowerCase()} raised`,
      `<p>${esc(who)} raised a ${esc(priority)}-priority ticket.</p>${ticketTable(t)}`
    ),
  });
}
