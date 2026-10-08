import { jsPDF } from "jspdf";
import autoTable, { type CellDef, type RowInput } from "jspdf-autotable";
import {
  fmtDate,
  fmtDateTime,
  fmtDuration,
  periodLabel,
  pct,
  type FeedbackFilters,
  type Summary,
  type TicketRow,
} from "@/lib/feedback-report";

type RGB = [number, number, number];
const RED: RGB = [238, 49, 36];
const INK: RGB = [17, 17, 17];
const GREY: RGB = [110, 110, 110];
const SOFT: RGB = [246, 246, 246];
const LINE: RGB = [221, 221, 221];
const STATUS_COLOR: Record<string, RGB> = {
  NEW: [59, 130, 246],
  REVIEWING: [245, 158, 11],
  PLANNED: [238, 49, 36],
  DONE: [34, 160, 90],
  DISMISSED: [156, 163, 175],
};

const PAGE_W = 297;
const M = 12; // margin
const W = PAGE_W - M * 2;

/** The built-in PDF fonts only cover Latin-1, so tidy the rest instead of printing junk. */
function t(s: string | null | undefined, max = 0): string {
  let out = String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\r/g, "")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?")
    .trim();
  if (max && out.length > max) out = out.slice(0, max - 1).trimEnd() + "…".replace("…", "...");
  return out;
}

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };

export function buildPdf(
  rows: TicketRow[],
  summary: Summary,
  f: FeedbackFilters,
  filterNotes: string[]
): Uint8Array {
  const doc: Doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const generated = fmtDateTime(new Date());
  const lastY = () => doc.lastAutoTable?.finalY ?? 0;

  /* ----------------------------- page 1 header ----------------------------- */
  doc.setFillColor(...RED);
  doc.rect(0, 0, PAGE_W, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(13);
  doc.text("Ogilvy", M, 9.3);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("TOOLS HUB", M + 19, 9.3, { charSpace: 0.8 });
  doc.text("Feedback & Bug Fix Report", PAGE_W - M, 9.3, { align: "right" });

  doc.setTextColor(...INK).setFont("helvetica", "bold").setFontSize(19);
  doc.text("Feedback & Bug Fix Report", M, 26);
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...GREY);
  doc.text(`Period: ${t(periodLabel(f))}`, M, 32.5);
  doc.text(`Filters: ${filterNotes.length ? t(filterNotes.join("  |  ")) : "none"}`, M, 37);
  doc.text(`Generated: ${generated}  |  All times UTC`, M, 41.5);

  /* -------------------------------- KPI cards ------------------------------- */
  const kpis: [string, string, string][] = [
    ["Total tickets", String(summary.total), `${summary.bugs.total} bugs, ${summary.suggestions} suggestions`],
    ["Open", String(summary.open), `${summary.urgentOpen} critical/high`],
    ["Resolved", String(summary.resolved), `${summary.dismissed} closed w/o action`],
    ["Resolution rate", pct(summary.resolutionRate), "of non-closed tickets"],
    ["Avg time to resolve", fmtDuration(summary.avgResolveMs), `median ${fmtDuration(summary.medianResolveMs)}`],
    ["Bugs fixed", `${summary.bugs.resolved}/${summary.bugs.total}`, `avg fix ${fmtDuration(summary.bugs.avgFixMs)}`],
  ];
  const gap = 4;
  const cw = (W - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach(([label, value, sub], i) => {
    const x = M + i * (cw + gap);
    doc.setFillColor(...SOFT).setDrawColor(...LINE).roundedRect(x, 47, cw, 22, 1.5, 1.5, "FD");
    doc.setFillColor(...RED).rect(x, 47, 1.4, 22, "F");
    doc.setTextColor(...GREY).setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(label.toUpperCase(), x + 5, 53, { charSpace: 0.3 });
    doc.setTextColor(...INK).setFont("helvetica", "bold").setFontSize(17);
    doc.text(value, x + 5, 62);
    doc.setTextColor(...GREY).setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(t(sub), x + 5, 66.6);
  });

  /* ---------------------------- status distribution -------------------------- */
  let y = 77;
  doc.setTextColor(...INK).setFont("helvetica", "bold").setFontSize(10);
  doc.text("Status distribution", M, y);
  y += 3;
  if (summary.total > 0) {
    let x = M;
    for (const s of summary.byStatus) {
      if (!s.count) continue;
      const w = (s.count / summary.total) * W;
      doc.setFillColor(...(STATUS_COLOR[s.key] ?? GREY)).rect(x, y, w, 6, "F");
      if (w > 12) {
        doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(7.5);
        doc.text(String(s.count), x + w / 2, y + 4.2, { align: "center" });
      }
      x += w;
    }
  } else {
    doc.setFillColor(...SOFT).rect(M, y, W, 6, "F");
  }
  let lx = M;
  doc.setFont("helvetica", "normal").setFontSize(8);
  for (const s of summary.byStatus) {
    doc.setFillColor(...(STATUS_COLOR[s.key] ?? GREY)).rect(lx, y + 9, 3, 3, "F");
    doc.setTextColor(...INK);
    const label = `${s.label} (${s.count})`;
    doc.text(label, lx + 4.5, y + 11.5);
    lx += 8 + doc.getTextWidth(label) + 6;
  }

  /* ------------------------------- breakdowns -------------------------------- */
  const head = { fillColor: RED, textColor: [255, 255, 255] as RGB, fontStyle: "bold" as const, fontSize: 8 };
  const base = { fontSize: 8.5, cellPadding: 1.8, lineColor: LINE, lineWidth: 0.1, textColor: INK };
  const half = (W - 8) / 2;
  const top = y + 18;
  autoTable(doc, {
    startY: top,
    margin: { left: M, right: PAGE_W - M - half },
    head: [["Priority", "Tickets"]],
    body: summary.byPriority.map((c) => [c.label, String(c.count)]),
    headStyles: head, styles: base, alternateRowStyles: { fillColor: SOFT },
    columnStyles: { 1: { halign: "right", cellWidth: 24 } },
  });
  const leftEnd = lastY();
  autoTable(doc, {
    startY: top,
    margin: { left: M + half + 8, right: M },
    head: [["Top tools / areas", "Tickets"]],
    body: summary.byTool.length ? summary.byTool.map((c) => [t(c.label, 48), String(c.count)]) : [["No tickets", "0"]],
    headStyles: head, styles: base, alternateRowStyles: { fillColor: SOFT },
    columnStyles: { 1: { halign: "right", cellWidth: 24 } },
  });
  void leftEnd;

  /* ------------------------------ bug fixing details ------------------------- */
  const section = (title: string, sub: string) => {
    doc.addPage();
    doc.setTextColor(...INK).setFont("helvetica", "bold").setFontSize(13);
    doc.text(title, M, 20);
    doc.setTextColor(...GREY).setFont("helvetica", "normal").setFontSize(8.5);
    doc.text(sub, M, 25.5);
    doc.setDrawColor(...RED).setLineWidth(0.6).line(M, 28, M + 30, 28);
  };
  const empty = (msg: string) => {
    doc.setTextColor(...GREY).setFont("helvetica", "italic").setFontSize(10);
    doc.text(msg, M, 40);
  };
  const tableDefaults = {
    headStyles: { ...head, fontSize: 7.5 },
    styles: { ...base, fontSize: 7.8, cellPadding: 1.6, valign: "top" as const, overflow: "linebreak" as const },
    alternateRowStyles: { fillColor: SOFT },
    margin: { left: M, right: M, top: 18, bottom: 14 },
    rowPageBreak: "avoid" as const,
  };
  const prioCell = (r: TicketRow): CellDef => ({
    content: r.priorityLabel,
    styles: r.priority === "CRITICAL" || r.priority === "HIGH" ? { textColor: RED, fontStyle: "bold" } : {},
  });
  const statusCell = (r: TicketRow): CellDef => ({
    content: r.statusLabel,
    styles: { textColor: STATUS_COLOR[r.status] ?? INK, fontStyle: "bold" },
  });

  const fixed = rows
    .filter((r) => r.kind === "BUG" && r.status === "DONE")
    .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0));
  section(
    "Bug fixing details",
    `${fixed.length} bug${fixed.length === 1 ? "" : "s"} fixed  |  average time to fix ${fmtDuration(summary.bugs.avgFixMs)}`
  );
  if (fixed.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 31,
      head: [["Ticket", "Tool / area", "Bug", "Priority", "Reported by", "Reported", "Fixed", "Time to fix", "What was wrong", "Fix details"]],
      body: fixed.map<RowInput>((r) => [
        r.code, t(r.tool, 30), t(r.title, 90), prioCell(r), t(r.reporterName || r.reporterEmail, 28),
        fmtDate(r.createdAt), fmtDate(r.resolvedAt), fmtDuration(r.timeToResolveMs),
        t(r.description, 240), t(r.requesterNote || "(no fix note recorded)", 420),
      ]),
      columnStyles: {
        0: { cellWidth: 15, fontStyle: "bold" }, 1: { cellWidth: 22 }, 2: { cellWidth: 36 }, 3: { cellWidth: 13 },
        4: { cellWidth: 22 }, 5: { cellWidth: 17 }, 6: { cellWidth: 17 }, 7: { cellWidth: 14 },
        8: { cellWidth: 50 }, 9: { cellWidth: "auto" },
      },
    });
  } else {
    empty("No bugs were fixed in this period.");
  }

  /* --------------------------------- open bugs ------------------------------- */
  const openBugs = rows
    .filter((r) => r.kind === "BUG" && r.openForMs !== null)
    .sort((a, b) => (b.openForMs ?? 0) - (a.openForMs ?? 0));
  section("Open bugs", `${openBugs.length} bug${openBugs.length === 1 ? "" : "s"} still to fix, oldest first`);
  if (openBugs.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 31,
      head: [["Ticket", "Tool / area", "Bug", "Priority", "Status", "Reported by", "Reported", "Open for", "Latest note"]],
      body: openBugs.map<RowInput>((r) => [
        r.code, t(r.tool, 30), t(r.title, 100), prioCell(r), statusCell(r), t(r.reporterName || r.reporterEmail, 28),
        fmtDate(r.createdAt), fmtDuration(r.openForMs), t(r.requesterNote || "-", 260),
      ]),
      columnStyles: {
        0: { cellWidth: 15, fontStyle: "bold" }, 1: { cellWidth: 26 }, 2: { cellWidth: 55 }, 3: { cellWidth: 15 },
        4: { cellWidth: 18 }, 5: { cellWidth: 28 }, 6: { cellWidth: 18 }, 7: { cellWidth: 15 }, 8: { cellWidth: "auto" },
      },
    });
  } else {
    empty("No open bugs in this period.");
  }

  /* ---------------------------------- all tickets ---------------------------- */
  section("All tickets", `${rows.length} ticket${rows.length === 1 ? "" : "s"} in this report, newest first`);
  if (rows.length) {
    autoTable(doc, {
      ...tableDefaults,
      startY: 31,
      head: [["Ticket", "Type", "Title", "Tool / area", "Priority", "Status", "Raised by", "Raised", "Resolved", "Time to resolve"]],
      body: rows.map<RowInput>((r) => [
        r.code, r.kindLabel, t(r.title, 110), t(r.tool, 32), prioCell(r), statusCell(r),
        t(r.reporterName || r.reporterEmail || "-", 30), fmtDate(r.createdAt), fmtDate(r.resolvedAt),
        r.timeToResolveMs == null ? (r.openForMs == null ? "-" : `open ${fmtDuration(r.openForMs)}`) : fmtDuration(r.timeToResolveMs),
      ]),
      columnStyles: {
        0: { cellWidth: 15, fontStyle: "bold" }, 1: { cellWidth: 20 }, 2: { cellWidth: "auto" }, 3: { cellWidth: 32 },
        4: { cellWidth: 16 }, 5: { cellWidth: 18 }, 6: { cellWidth: 32 }, 7: { cellWidth: 20 }, 8: { cellWidth: 20 }, 9: { cellWidth: 24 },
      },
    });
  } else {
    empty("No tickets match these filters.");
  }

  /* ------------------------------ page chrome (all pages) -------------------- */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      doc.setFillColor(...RED).rect(0, 0, PAGE_W, 3, "F");
      doc.setTextColor(...GREY).setFont("helvetica", "normal").setFontSize(7.5);
      doc.text("Ogilvy Tools Hub  |  Feedback & Bug Fix Report", M, 11);
      doc.text(t(periodLabel(f)), PAGE_W - M, 11, { align: "right" });
    }
    doc.setDrawColor(...LINE).setLineWidth(0.2).line(M, 200, PAGE_W - M, 200);
    doc.setTextColor(...GREY).setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(`Generated ${generated}  |  Confidential: internal use only`, M, 204.5);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - M, 204.5, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
