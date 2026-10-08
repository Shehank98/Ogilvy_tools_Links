"use client";

import { useEffect, useState, useTransition } from "react";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
  type AuthResult,
} from "@/lib/actions/user-auth";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";

const input =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const primary =
  "w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50";
const linkBtn =
  "text-sm font-medium text-brand hover:text-brand-dark disabled:text-neutral-400";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-neutral-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function AuthPanel({ domain }: { domain: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  /** Runs a server action; on success moves to the step it asks for. */
  function run(fn: () => Promise<AuthResult | void>, onOk?: (r: AuthResult) => void) {
    setError(null);
    start(async () => {
      const r = (await fn()) as AuthResult | undefined; // successful sign-in redirects instead
      if (!r) return;
      if (r.error) {
        if (r.next === "verify") go("verify");
        setError(r.error);
        return;
      }
      if (r.next === "verify") { go("verify"); setCooldown(30); }
      if (r.next === "reset") go("reset");
      if (r.message) setInfo(r.message);
      onOk?.(r);
    });
  }

  function form(handler: (fd: FormData) => void) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handler(new FormData(e.currentTarget));
    };
  }
  const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
  const raw = (fd: FormData, k: string) => String(fd.get(k) ?? "");

  const tabs = mode === "login" || mode === "register";

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      {tabs && (
        <div className="-mt-1 mb-5 flex border-b border-neutral-200">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => go(m)}
              className={`-mb-px border-b-2 px-4 pb-2.5 pt-1 text-sm font-semibold ${
                mode === m ? "border-brand text-black" : "border-transparent text-neutral-500 hover:text-black"
              }`}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {info && !error && <p role="status" className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>}

      {mode === "login" && (
        <form className="space-y-4" onSubmit={form((fd) => { setEmail(val(fd, "email")); run(() => loginUser({ email: val(fd, "email"), password: raw(fd, "password") })); })}>
          <Field label="Ogilvy email">
            <input name="email" type="email" required autoComplete="username" placeholder={`firstname.lastname@${domain}`} defaultValue={email} className={input} />
          </Field>
          <Field label="Password">
            <input name="password" type="password" required autoComplete="current-password" className={input} />
          </Field>
          <button type="submit" disabled={pending} className={primary}>{pending ? "Signing in…" : "Sign in"}</button>
          <div className="flex justify-between">
            <button type="button" className={linkBtn} onClick={() => go("forgot")}>Forgot password?</button>
            <button type="button" className={linkBtn} onClick={() => go("register")}>New here? Create an account</button>
          </div>
        </form>
      )}

      {mode === "register" && (
        <form
          className="space-y-4"
          onSubmit={form((fd) => {
            const pw = raw(fd, "password");
            if (pw !== raw(fd, "confirm")) return setError("Passwords do not match.");
            setEmail(val(fd, "email"));
            run(() => registerUser({ name: val(fd, "name"), email: val(fd, "email"), password: pw }));
          })}
        >
          <Field label="Full name"><input name="name" required maxLength={80} autoComplete="name" className={input} /></Field>
          <Field label="Ogilvy email"><input name="email" type="email" required autoComplete="email" placeholder={`firstname.lastname@${domain}`} defaultValue={email} className={input} /></Field>
          <Field label="Password" hint="At least 10 characters, with a letter and a number.">
            <input name="password" type="password" required autoComplete="new-password" className={input} />
          </Field>
          <Field label="Confirm password"><input name="confirm" type="password" required autoComplete="new-password" className={input} /></Field>
          <button type="submit" disabled={pending} className={primary}>{pending ? "Creating…" : "Create account & send code"}</button>
        </form>
      )}

      {mode === "verify" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-black">Check your inbox</h2>
            <p className="mt-1 text-sm text-neutral-500">Enter the 6-digit code sent to <strong>{email}</strong>. It is valid for 15 minutes.</p>
          </div>
          <form className="space-y-4" onSubmit={form((fd) => run(() => verifyEmail({ email, code: val(fd, "code") })))}>
            <Field label="6-digit code">
              <input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoFocus autoComplete="one-time-code" placeholder="000000" className={`${input} text-center text-xl font-bold tracking-[0.4em]`} />
            </Field>
            <button type="submit" disabled={pending} className={primary}>{pending ? "Verifying…" : "Verify & continue"}</button>
          </form>
          <div className="flex justify-between">
            <button type="button" className={linkBtn} disabled={pending || cooldown > 0} onClick={() => run(() => resendVerification(email), () => setCooldown(30))}>
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </button>
            <button type="button" className={linkBtn} onClick={() => go("register")}>Use a different email</button>
          </div>
        </div>
      )}

      {mode === "forgot" && (
        <form className="space-y-4" onSubmit={form((fd) => { setEmail(val(fd, "email")); run(() => requestPasswordReset(val(fd, "email"))); })}>
          <div>
            <h2 className="font-serif text-xl font-bold text-black">Reset your password</h2>
            <p className="mt-1 text-sm text-neutral-500">We&apos;ll email you a code to choose a new one.</p>
          </div>
          <Field label="Ogilvy email"><input name="email" type="email" required autoComplete="email" defaultValue={email} className={input} /></Field>
          <button type="submit" disabled={pending} className={primary}>{pending ? "Sending…" : "Email me a reset code"}</button>
          <button type="button" className={linkBtn} onClick={() => go("login")}>Back to sign in</button>
        </form>
      )}

      {mode === "reset" && (
        <form
          className="space-y-4"
          onSubmit={form((fd) => {
            const pw = raw(fd, "password");
            if (pw !== raw(fd, "confirm")) return setError("Passwords do not match.");
            run(() => resetPassword({ email, code: val(fd, "code"), password: pw }), (r) => { go("login"); setInfo(r.message ?? null); });
          })}
        >
          <h2 className="font-serif text-xl font-bold text-black">Choose a new password</h2>
          <Field label="Reset code"><input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoFocus autoComplete="one-time-code" placeholder="000000" className={`${input} text-center text-xl font-bold tracking-[0.4em]`} /></Field>
          <Field label="New password" hint="At least 10 characters, with a letter and a number."><input name="password" type="password" required autoComplete="new-password" className={input} /></Field>
          <Field label="Confirm new password"><input name="confirm" type="password" required autoComplete="new-password" className={input} /></Field>
          <button type="submit" disabled={pending} className={primary}>{pending ? "Saving…" : "Update password"}</button>
          <button type="button" className={linkBtn} onClick={() => go("forgot")}>Start again</button>
        </form>
      )}
    </div>
  );
}
