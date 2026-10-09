import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { purgeResolvedStragglers } from "@/lib/ticket-files";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Safety net for the automatic file clean-up. Files are normally deleted the
 * moment a ticket is set to Done or Closed; this sweep removes any that were
 * missed (for example if storage was unreachable at that moment).
 *
 * Call it on a schedule:  Authorization: Bearer <CRON_SECRET>
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set on the server." }, { status: 503 });
  }
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await purgeResolvedStragglers();
  return NextResponse.json({ ok: result.failed === 0, ...result });
}

export const GET = run;
export const POST = run;
