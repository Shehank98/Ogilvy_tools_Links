import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openObject } from "@/lib/storage";
import { IMAGE_TYPES } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Admin-only download/preview of one ticket attachment. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const file = await prisma.ticketFile.findUnique({ where: { id } });
  if (!file || file.deletedAt) {
    return NextResponse.json({ error: "This file has been removed." }, { status: 404 });
  }

  const inline = IMAGE_TYPES.has(file.contentType);
  try {
    const res = await openObject(file.path, {
      contentType: file.contentType,
      fileName: file.name,
      inline,
    });
    if (res.kind === "redirect") {
      return NextResponse.redirect(res.url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
    }
    return new NextResponse(new Uint8Array(res.data), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[files] could not open", file.path, e);
    return NextResponse.json({ error: "The file could not be fetched from storage." }, { status: 502 });
  }
}
