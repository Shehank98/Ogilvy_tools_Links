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
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.databaseConnection = "ok";
  } catch (e) {
    checks.databaseConnection = `FAILED — ${shortError(e)}`;
  }

  if (checks.databaseConnection === "ok") {
    try {
      await prisma.tool.count();
      checks.migrations = "ok (tables exist)";
    } catch (e) {
      checks.migrations = `FAILED — tables missing? Run "npx prisma migrate deploy". ${shortError(e)}`;
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
