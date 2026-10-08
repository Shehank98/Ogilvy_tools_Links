"use server";

import { redirect } from "next/navigation";
import type { EmailCodePurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendCodeEmail } from "@/lib/mail";
import {
  CODE_MAX_TRIES,
  CODE_TTL_MIN,
  CODES_PER_HOUR,
  LOGIN_LOCK_MIN,
  LOGIN_MAX_FAILS,
  PASSWORD_RULE,
  allowedDomains,
  codesMatch,
  createUserSession,
  destroyUserSession,
  generateCode,
  hashCode,
  hashPassword,
  isStrongPassword,
  normalizeCompanyEmail,
  verifyPassword,
} from "@/lib/user-auth";

export type AuthResult = {
  error?: string;
  message?: string;
  /** Tells the form which step to show next. */
  next?: "verify" | "reset";
};

const BAD_DOMAIN = () => `Please use your @${allowedDomains()[0]} email address.`;

class UserError extends Error {}

/** Creates (or refreshes) a code, rate-limited per email + purpose, and mails it. */
async function issueCode(email: string, purpose: EmailCodePurpose, name: string) {
  const existing = await prisma.emailCode.findUnique({
    where: { email_purpose: { email, purpose } },
  });
  const now = new Date();
  let sendCount = 1;
  let windowStart = now;
  if (existing && now.getTime() - existing.windowStart.getTime() < 3_600_000) {
    if (existing.sendCount >= CODES_PER_HOUR) {
      throw new UserError("Too many code requests. Please try again in an hour.");
    }
    sendCount = existing.sendCount + 1;
    windowStart = existing.windowStart;
  }

  const code = generateCode();
  const data = {
    codeHash: hashCode(email, purpose, code),
    expiresAt: new Date(now.getTime() + CODE_TTL_MIN * 60_000),
    attempts: 0,
    sendCount,
    windowStart,
  };
  await prisma.emailCode.upsert({
    where: { email_purpose: { email, purpose } },
    create: { email, purpose, ...data },
    update: data,
  });
  try {
    await sendCodeEmail(email, name, purpose, code);
  } catch (e) {
    console.error("[auth] could not send code email:", e);
    throw new UserError("We couldn't send the email just now. Please try again shortly.");
  }
}

/** Checks a submitted code; throws UserError with a friendly message if wrong. */
async function consumeCode(email: string, purpose: EmailCodePurpose, input: string) {
  const row = await prisma.emailCode.findUnique({
    where: { email_purpose: { email, purpose } },
  });
  if (!row || row.expiresAt < new Date()) {
    if (row) await prisma.emailCode.delete({ where: { id: row.id } });
    throw new UserError("That code has expired. Please request a new one.");
  }
  if (row.attempts >= CODE_MAX_TRIES) {
    await prisma.emailCode.delete({ where: { id: row.id } });
    throw new UserError("Too many wrong attempts. Please request a new code.");
  }
  const code = input.trim();
  if (!/^\d{6}$/.test(code) || !codesMatch(hashCode(email, purpose, code), row.codeHash)) {
    const updated = await prisma.emailCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    throw new UserError(
      `Incorrect code. ${Math.max(0, CODE_MAX_TRIES - updated.attempts)} tries left.`
    );
  }
  await prisma.emailCode.delete({ where: { id: row.id } });
}

function fail(e: unknown): AuthResult {
  if (e instanceof UserError) return { error: e.message };
  console.error("[auth]", e);
  return { error: "Something went wrong. Please try again." };
}

/* ------------------------------- actions ------------------------------- */

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const name = String(input.name ?? "").trim();
    const email = normalizeCompanyEmail(input.email);
    if (name.length < 2 || name.length > 80) return { error: "Please enter your full name." };
    if (!email) return { error: BAD_DOMAIN() };
    if (!isStrongPassword(input.password)) return { error: PASSWORD_RULE };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.verified) {
      return { error: "An account with this email already exists. Please sign in." };
    }
    const passwordHash = await hashPassword(input.password);
    await prisma.user.upsert({
      where: { email },
      create: { email, name, passwordHash },
      update: { name, passwordHash }, // unverified account being re-registered
    });
    await issueCode(email, "VERIFY", name);
    return { next: "verify", message: `We sent a 6-digit code to ${email}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function resendVerification(emailRaw: string): Promise<AuthResult> {
  try {
    const email = normalizeCompanyEmail(emailRaw);
    if (!email) return { error: BAD_DOMAIN() };
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.verified) await issueCode(email, "VERIFY", user.name);
    return { message: "If that account is waiting for verification, a new code is on its way." };
  } catch (e) {
    return fail(e);
  }
}

export async function verifyEmail(input: { email: string; code: string }): Promise<AuthResult> {
  try {
    const email = normalizeCompanyEmail(input.email);
    if (!email) return { error: BAD_DOMAIN() };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { error: "Account not found. Please create it again." };
    await consumeCode(email, "VERIFY", input.code);
    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
    });
    await createUserSession(user.id);
  } catch (e) {
    return fail(e);
  }
  redirect("/");
}

export async function loginUser(input: { email: string; password: string }): Promise<AuthResult> {
  try {
    const email = normalizeCompanyEmail(input.email);
    if (!email) return { error: BAD_DOMAIN() };
    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      return { error: `Too many failed attempts. Please wait ${LOGIN_LOCK_MIN} minutes and try again.` };
    }
    const ok = await verifyPassword(String(input.password ?? ""), user?.passwordHash ?? null);
    if (!user || !ok) {
      if (user) {
        const fails = user.failedLogins + 1;
        await prisma.user.update({
          where: { id: user.id },
          data:
            fails >= LOGIN_MAX_FAILS
              ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOGIN_LOCK_MIN * 60_000) }
              : { failedLogins: fails },
        });
      }
      return { error: "Incorrect email or password." };
    }
    if (!user.verified) {
      await issueCode(email, "VERIFY", user.name);
      return { next: "verify", message: `Please verify your email first. We sent a new code to ${email}.` };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await createUserSession(user.id);
  } catch (e) {
    return fail(e);
  }
  redirect("/");
}

export async function requestPasswordReset(emailRaw: string): Promise<AuthResult> {
  const email = normalizeCompanyEmail(emailRaw);
  if (!email) return { error: BAD_DOMAIN() };
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.verified) await issueCode(email, "RESET", user.name);
  } catch (e) {
    console.error("[auth] reset request:", e); // never reveal whether the account exists
  }
  return { next: "reset", message: `If that account exists, a reset code is on its way to ${email}.` };
}

export async function resetPassword(input: {
  email: string;
  code: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const email = normalizeCompanyEmail(input.email);
    if (!email) return { error: BAD_DOMAIN() };
    if (!isStrongPassword(input.password)) return { error: PASSWORD_RULE };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { error: "Incorrect or expired code." };
    await consumeCode(email, "RESET", input.code);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(input.password),
          verified: true,
          failedLogins: 0,
          lockedUntil: null,
        },
      }),
      prisma.userSession.deleteMany({ where: { userId: user.id } }), // sign out everywhere
    ]);
    return { message: "Password updated. You can sign in now." };
  } catch (e) {
    return fail(e);
  }
}

export async function logoutUser(): Promise<void> {
  await destroyUserSession();
  redirect("/login");
}
