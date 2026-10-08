import ExcelJS from "exceljs";
import {
  fmtDuration,
  fmtDateTime,
  periodLabel,
  pct,
  type FeedbackFilters,
  type Summary,
  type TicketRow,
} from "@/lib/feedback-report";

const RED = "FFEE3124";
const INK = "FF111111";
const SOFT = "FFF6F6F6";
const LINE = { style: "thin" as const, color: { argb: "FFDDDDDD" } };

const STATUS_FILL: Record<string, string> = {
  NEW: "FFDBEAFE",
  REVIEWING: "FFFEF3C7",
  PLANNED: "FFFDECEA",
  DONE: "FFDCFCE7",
  DISMISSED: "FFE5E7EB",
};
const PRIORITY_FONT: Record<string, string> = { CRITICAL: "FFB80023", HIGH: "FFC2410C" };

function styleHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
    c.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
}

function addTable(
  ws: ExcelJS.Worksheet,
  columns: { header: string; width: number; wrap?: boolean }[],
  rows: (string | number | Date | null)[][],
  decorate?: (row: ExcelJS.Row, i: number) => void
) {
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  styleHeader(ws.getRow(1));
  rows.forEach((r, i) => {
    const row = ws.addRow(r);
    row.alignment = { vertical: "top", wrapText: false };
    columns.forEach((c, j) => {
      const cell = row.getCell(j + 1);
      cell.border = { bottom: LINE };
      cell.font = { size: 10 };
      if (c.wrap) cell.alignment = { vertical: "top", wrapText: true };
      if (r[j] instanceof Date) cell.numFmt = "dd mmm yyyy hh:mm";
    });
    decorate?.(row, i);
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

function colorise(row: ExcelJS.Row, statusCol: number, priorityCol: number, t: TicketRow) {
  const s = row.getCell(statusCol);
  s.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[t.status] ?? SOFT } };
  s.font = { bold: true, size: 10 };
  const color = PRIORITY_FONT[t.priority];
  if (color) row.getCell(priorityCol).font = { bold: true, size: 10, color: { argb: color } };
}

export async function buildWorkbook(
  rows: TicketRow[],
  summary: Summary,
  f: FeedbackFilters,
  filterNotes: string[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ogilvy Tools Hub";
  wb.created = new Date();
  wb.title = "Feedback & Bug Fix Report";

  /* ------------------------------ Summary ------------------------------ */
  const sum = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  sum.columns = [{ width: 34 }, { width: 18 }, { width: 18 }, { width: 18 }];
  sum.mergeCells("A1:D1");
  const title = sum.getCell("A1");
  title.value = "Feedback & Bug Fix Report";
  title.font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  title.alignment = { vertical: "middle", indent: 1 };
  sum.getRow(1).height = 34;

  const meta: [string, string][] = [
    ["Period", periodLabel(f)],
    ["Filters", filterNotes.length ? filterNotes.join(" · ") : "None"],
    ["Generated", fmtDateTime(new Date())],
  ];
  meta.forEach(([k, v], i) => {
    const r = sum.getRow(3 + i);
    r.getCell(1).value = k;
    r.getCell(1).font = { bold: true, color: { argb: "FF6E6E6E" } };
    sum.mergeCells(r.number, 2, r.number, 4);
    r.getCell(2).value = v;
  });

  let at = 7;
  const section = (name: string) => {
    sum.mergeCells(at, 1, at, 4);
    const c = sum.getCell(at, 1);
    c.value = name;
    c.font = { bold: true, size: 12, color: { argb: INK } };
    c.border = { bottom: { style: "medium", color: { argb: RED } } };
    at += 1;
  };
  const kv = (k: string, v: string | number) => {
    const r = sum.getRow(at++);
    r.getCell(1).value = k;
    r.getCell(2).value = v;
    r.getCell(2).font = { bold: true };
    r.getCell(2).alignment = { horizontal: "right" };
    r.getCell(1).border = r.getCell(2).border = { bottom: LINE };
  };

  section("Headline numbers");
  kv("Total tickets", summary.total);
  kv("Open (not yet resolved)", summary.open);
  kv("Resolved", summary.resolved);
  kv("Closed without action", summary.dismissed);
  kv("Resolution rate", pct(summary.resolutionRate));
  kv("Average time to resolve", fmtDuration(summary.avgResolveMs));
  kv("Median time to resolve", fmtDuration(summary.medianResolveMs));
  kv("Critical / high priority still open", summary.urgentOpen);
  kv("Oldest open ticket", fmtDuration(summary.oldestOpenMs));
  at += 1;

  section("Bugs");
  kv("Bugs reported", summary.bugs.total);
  kv("Bugs fixed", summary.bugs.resolved);
  kv("Bugs still open", summary.bugs.open);
  kv("Average time to fix a bug", fmtDuration(summary.bugs.avgFixMs));
  kv("Suggestions & ideas", summary.suggestions);
  at += 1;

  for (const [name, list] of [
    ["By status", summary.byStatus],
    ["By priority", summary.byPriority],
    ["By tool / area (top 10)", summary.byTool],
  ] as const) {
    section(name);
    list.forEach((c) => kv(c.label, c.count));
    at += 1;
  }

  /* ------------------------------ Tickets ------------------------------ */
  addTable(
    wb.addWorksheet("Tickets"),
    [
      { header: "Ticket", width: 11 },
      { header: "Type", width: 12 },
      { header: "Title", width: 38, wrap: true },
      { header: "Tool / area", width: 22 },
      { header: "Priority", width: 11 },
      { header: "Status", width: 12 },
      { header: "Raised by", width: 22 },
      { header: "Email", width: 28 },
      { header: "Raised (UTC)", width: 18 },
      { header: "Last updated (UTC)", width: 18 },
      { header: "Resolved (UTC)", width: 18 },
      { header: "Time to resolve", width: 15 },
      { header: "Open for", width: 12 },
      { header: "Description", width: 55, wrap: true },
      { header: "Steps to reproduce", width: 40, wrap: true },
      { header: "Fix details / note to requester", width: 45, wrap: true },
      { header: "Internal notes", width: 40, wrap: true },
    ],
    rows.map((t) => [
      t.code, t.kindLabel, t.title, t.tool, t.priorityLabel, t.statusLabel,
      t.reporterName, t.reporterEmail, t.createdAt, t.updatedAt, t.resolvedAt,
      t.timeToResolveMs == null ? "" : fmtDuration(t.timeToResolveMs),
      t.openForMs == null ? "" : fmtDuration(t.openForMs),
      t.description, t.steps, t.requesterNote, t.internalNotes,
    ]),
    (row, i) => colorise(row, 6, 5, rows[i])
  );

  /* ------------------------------ Bug fixes ------------------------------ */
  const fixed = rows
    .filter((t) => t.kind === "BUG" && t.status === "DONE")
    .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0));
  addTable(
    wb.addWorksheet("Bug fixes"),
    [
      { header: "Ticket", width: 11 },
      { header: "Tool / area", width: 22 },
      { header: "Bug", width: 38, wrap: true },
      { header: "Priority", width: 11 },
      { header: "Reported by", width: 22 },
      { header: "Reported (UTC)", width: 18 },
      { header: "Fixed (UTC)", width: 18 },
      { header: "Time to fix", width: 13 },
      { header: "What was wrong", width: 55, wrap: true },
      { header: "Fix details", width: 55, wrap: true },
      { header: "Internal notes", width: 40, wrap: true },
    ],
    fixed.map((t) => [
      t.code, t.tool, t.title, t.priorityLabel, t.reporterName || t.reporterEmail,
      t.createdAt, t.resolvedAt, fmtDuration(t.timeToResolveMs),
      t.description, t.requesterNote, t.internalNotes,
    ]),
    (row, i) => {
      const color = PRIORITY_FONT[fixed[i].priority];
      if (color) row.getCell(4).font = { bold: true, size: 10, color: { argb: color } };
    }
  );

  /* ------------------------------ Open bugs ------------------------------ */
  const openBugs = rows
    .filter((t) => t.kind === "BUG" && t.openForMs !== null)
    .sort((a, b) => (b.openForMs ?? 0) - (a.openForMs ?? 0));
  addTable(
    wb.addWorksheet("Open bugs"),
    [
      { header: "Ticket", width: 11 },
      { header: "Tool / area", width: 22 },
      { header: "Bug", width: 38, wrap: true },
      { header: "Priority", width: 11 },
      { header: "Status", width: 12 },
      { header: "Reported by", width: 22 },
      { header: "Reported (UTC)", width: 18 },
      { header: "Open for", width: 12 },
      { header: "Description", width: 55, wrap: true },
      { header: "Latest note", width: 45, wrap: true },
    ],
    openBugs.map((t) => [
      t.code, t.tool, t.title, t.priorityLabel, t.statusLabel,
      t.reporterName || t.reporterEmail, t.createdAt, fmtDuration(t.openForMs),
      t.description, t.requesterNote,
    ]),
    (row, i) => colorise(row, 5, 4, openBugs[i])
  );

  /* ------------------------------ History ------------------------------ */
  addTable(
    wb.addWorksheet("Ticket history"),
    [
      { header: "Ticket", width: 11 },
      { header: "Title", width: 38 },
      { header: "When (UTC)", width: 18 },
      { header: "Status", width: 12 },
      { header: "Note", width: 70, wrap: true },
    ],
    rows.flatMap((t) => t.events.map((e) => [t.code, t.title, e.at, e.statusLabel, e.note]))
  );

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
