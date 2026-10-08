import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "admin_session";

function secret(): string {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

export function createSessionToken(): string {
  return createHmac("sha256", secret()).update("admin-session-v1").digest("hex");
}

/** Mark cookies Secure only when the request really arrived over HTTPS (also
 *  behind a proxy such as Railway). A Secure cookie over plain http is silently
 *  dropped by the browser, which makes sign-in look like it does nothing. */
export async function isSecureRequest(): Promise<boolean> {
  const proto = (await headers()).get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return process.env.NODE_ENV === "production" && !!process.env.APP_URL?.startsWith("https:");
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const expected = createSessionToken();
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
