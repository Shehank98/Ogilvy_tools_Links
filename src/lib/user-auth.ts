import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
} from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";
import { isSecureRequest } from "@/lib/auth";

export const USER_COOKIE = "user_session";
const SESSION_DAYS = 7;
export const CODE_TTL_MIN = 15;
export const CODE_MAX_TRIES = 5;
export const CODES_PER_HOUR = 5;
export const LOGIN_MAX_FAILS = 8;
export const LOGIN_LOCK_MIN = 15;

export type CurrentUser = { id: string; email: string; name: string };

/* ----------------------------- email domain ----------------------------- */

export function allowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "ogilvy.com")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** Lower-cased email if it belongs to an allowed company domain, else null. */
export function normalizeCompanyEmail(raw: unknown): string | null {
  const email = String(raw ?? "").trim().toLowerCase();
  const m = email.match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  if (!m || email.length > 120) return null;
  return allowedDomains().includes(m[1]) ? email : null;
}

/* ------------------------------- passwords ------------------------------ */

export const PASSWORD_RULE =
  "Password needs 6+ characters with at least one letter and one number.";

export function isStrongPassword(p: unknown): p is string {
  return (
    typeof p === "string" &&
    p.length >= 6 &&
    p.length <= 128 &&
    /[a-z]/i.test(p) &&
    /\d/.test(p)
  );
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null
): Promise<boolean> {
  // With no stored hash we still burn the same CPU so timing doesn't reveal
  // whether an account exists.
  const [saltHex, keyHex] = (stored ?? "00:00").split(":");
  const expected = Buffer.from(keyHex ?? "", "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex ?? "", "hex"));
  if (!stored || expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/* ------------------------------ email codes ----------------------------- */

function secret(): string {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(email: string, purpose: string, code: string): string {
  return createHmac("sha256", secret())
    .update(`${email}|${purpose}|${code}`)
    .digest("hex");
}

export function codesMatch(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ------------------------------- sessions ------------------------------- */

const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createUserSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.userSession.create({
    data: { tokenHash: tokenHash(token), userId, expiresAt },
  });
  (await cookies()).set(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await isSecureRequest(),
    expires: expiresAt,
    path: "/",
  });
  // Opportunistic clean-up of stale rows.
  await prisma.userSession
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});
  await prisma.emailCode
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } } })
    .catch(() => {});
}

export async function destroyUserSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(USER_COOKIE)?.value;
  if (token) {
    await prisma.userSession
      .deleteMany({ where: { tokenHash: tokenHash(token) } })
      .catch(() => {});
  }
  jar.delete(USER_COOKIE);
}

/** The signed-in, verified user for this request (deduped per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, name: true, verified: true } },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.verified) {
    return null;
  }
  const { id, email, name } = session.user;
  return { id, email, name };
});

/** Redirects to /login unless signed in. When login is switched off in
 *  FEATURES, resolves to null so pages keep working anonymously. */
export async function requireUser(): Promise<CurrentUser | null> {
  if (!FEATURES.userLogin) return null;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
