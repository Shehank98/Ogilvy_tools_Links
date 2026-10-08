import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  filterSummary,
  loadTargets,
  loadTickets,
  parseFilters,
  reportFileName,
  summarize,
} from "@/lib/feedback-report";
import { buildWorkbook } from "@/lib/report-excel";
import { buildPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/admin/feedback-export?format=xlsx|pdf&from=…&to=…&basis=…&status=… */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const format = sp.format === "pdf" ? "pdf" : "xlsx";
  const filters = parseFilters(sp);

  if (filters.from && filters.to && filters.from > filters.to) {
    return NextResponse.json({ error: "The start date is after the end date." }, { status: 400 });
  }

  const [rows, targets] = await Promise.all([loadTickets(filters), loadTargets()]);
  const summary = summarize(rows);
  const notes = filterSummary(filters, targets.find((t) => t.id === filters.target)?.name);

  const file = reportFileName(filters, format);
  const headers = {
    "Content-Disposition": `attachment; filename="${file}"`,
    "Cache-Control": "no-store",
  };

  if (format === "pdf") {
    const pdf = buildPdf(rows, summary, filters, notes);
    return new NextResponse(Buffer.from(pdf), {
      headers: { ...headers, "Content-Type": "application/pdf" },
    });
  }
  const xlsx = await buildWorkbook(rows, summary, filters, notes);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      ...headers,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
