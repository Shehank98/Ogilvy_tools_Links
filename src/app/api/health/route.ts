import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function shortError(e: unknown): string {
  if (e instanceof Error) {
    const firstLine = e.message.split("\n").filter(Boolean).slice(0, 3).join(" ");
    return `${e.name}: ${firstLine}`.slice(0, 400);
  }
  return String(e).slice(0, 400);
}

export async function GET() {
  const checks: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "set" : "MISSING",
    SESSION_SECRET: process.env.SESSION_SECRET ? "set" : "MISSING (falls back to ADMIN_PASSWORD)",
    APPS_SCRIPT_URL: process.env.APPS_SCRIPT_URL ? "set" : "MISSING (sign-up codes cannot be emailed)",
    APPS_SCRIPT_SECRET: process.env.APPS_SCRIPT_SECRET ? "set" : "MISSING",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.databaseConnection = "ok";
  } catch (e) {
    checks.databaseConnection = `FAILED: ${shortError(e)}`;
  }

  if (checks.databaseConnection === "ok") {
    // Probe a table/column from every migration generation, so a database that
    // is behind (e.g. the sign-in & tickets migration was never run) is caught
    // here instead of crashing pages later.
    try {
      await prisma.tool.count();
      await prisma.user.count();
      await prisma.feedback.findFirst({ select: { ticketNo: true } });
      await prisma.feedbackEvent.count();
      checks.migrations = "ok (tables exist)";
    } catch (e) {
      checks.migrations = `FAILED: database is behind the code. Run "npx prisma migrate deploy" (see README). ${shortError(e)}`;
    }
  } else {
    checks.migrations = "skipped (no database connection)";
  }

  const healthy =
    checks.databaseConnection === "ok" && checks.migrations.startsWith("ok");

  return NextResponse.json(
    { healthy, checks },
    { status: healthy ? 200 : 500 }
  );
}
