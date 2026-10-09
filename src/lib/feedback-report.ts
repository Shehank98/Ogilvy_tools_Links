import type {
  FeedbackKind,
  FeedbackPriority,
  FeedbackStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  KIND_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  ticketCode,
} from "@/lib/tickets";

/* ------------------------------- filters -------------------------------- */

export type DateBasis = "raised" | "resolved" | "updated";

export type FeedbackFilters = {
  from?: string; // yyyy-mm-dd (UTC, inclusive)
  to?: string; // yyyy-mm-dd (UTC, inclusive)
  basis: DateBasis;
  status?: FeedbackStatus;
  kind?: FeedbackKind;
  priority?: FeedbackPriority;
  target?: string; // a tool/coming-soon id, or "general"
  assignee?: string; // a team member's name, or "unassigned"
  q?: string;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) =>
  allowed.includes(v as T) ? (v as T) : undefined;

export function parseFilters(sp: Params): FeedbackFilters {
  const from = one(sp.from);
  const to = one(sp.to);
  return {
    from: isDay(from) ? from : undefined,
    to: isDay(to) ? to : undefined,
    basis: pick(one(sp.basis), ["raised", "resolved", "updated"] as const) ?? "raised",
    status: pick(one(sp.status), ["NEW", "REVIEWING", "PLANNED", "DONE", "DISMISSED"] as const),
    kind: pick(one(sp.kind), ["BUG", "SUGGESTION", "IDEA"] as const),
    priority: pick(one(sp.priority), ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const),
    target: one(sp.target)?.slice(0, 60),
    assignee: one(sp.assignee)?.slice(0, 60),
    q: one(sp.q)?.slice(0, 100),
  };
}

/** Query string for links/exports that keep the current filters. */
export function filtersToQuery(f: FeedbackFilters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) {
    if (v && !(k === "basis" && v === "raised")) p.set(k, String(v));
  }
  return p.toString();
}

const dayStart = (d: string) => new Date(`${d}T00:00:00.000Z`);
const dayEndExclusive = (d: string) => new Date(dayStart(d).getTime() + 86_400_000);

/* -------------------------------- rows ---------------------------------- */

export type TicketRow = {
  id: string;
  ticketNo: number;
  code: string;
  kind: FeedbackKind;
  kindLabel: string;
  title: string;
  tool: string;
  targetType: string;
  priority: FeedbackPriority;
  priorityLabel: string;
  assignedTo: string[];
  status: FeedbackStatus;
  statusLabel: string;
  reporterName: string;
  reporterEmail: string;
  description: string;
  steps: string;
  requesterNote: string;
  internalNotes: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  /** createdAt -> resolvedAt, only for resolved tickets. */
  timeToResolveMs: number | null;
  /** How long an unresolved ticket has been open. */
  openForMs: number | null;
  events: { at: Date; status: FeedbackStatus; statusLabel: string; note: string }[];
};

type Loaded = Prisma.FeedbackGetPayload<{
  include: { user: { select: { name: true; email: true } }; events: true };
}>;

function toRow(t: Loaded, now: number): TicketRow {
  const events = [...t.events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let resolvedAt: Date | null = null;
  if (t.status === "DONE") {
    const done = [...events].reverse().find((e) => e.status === "DONE");
    resolvedAt = done?.createdAt ?? t.updatedAt; // legacy rows have no history
  }
  const open = t.status !== "DONE" && t.status !== "DISMISSED";
  return {
    id: t.id,
    ticketNo: t.ticketNo,
    code: ticketCode(t.ticketNo),
    kind: t.kind,
    kindLabel: KIND_LABEL[t.kind],
    title: t.title?.trim() || t.message.slice(0, 80),
    tool: t.targetName,
    targetType: t.targetType,
    priority: t.priority,
    priorityLabel: PRIORITY_LABEL[t.priority],
    assignedTo: t.assignedTo,
    status: t.status,
    statusLabel: STATUS_LABEL[t.status],
    reporterName: t.user?.name ?? "",
    reporterEmail: t.user?.email ?? t.email ?? "",
    description: t.message,
    steps: t.steps ?? "",
    requesterNote: t.publicNote ?? "",
    internalNotes: t.adminNotes ?? "",
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    resolvedAt,
    timeToResolveMs: resolvedAt ? Math.max(0, resolvedAt.getTime() - t.createdAt.getTime()) : null,
    openForMs: open ? Math.max(0, now - t.createdAt.getTime()) : null,
    events: events.map((e) => ({
      at: e.createdAt,
      status: e.status,
      statusLabel: STATUS_LABEL[e.status],
      note: e.note ?? "",
    })),
  };
}

export async function loadTickets(f: FeedbackFilters): Promise<TicketRow[]> {
  const where: Prisma.FeedbackWhereInput = {};
  if (f.status) where.status = f.status;
  if (f.kind) where.kind = f.kind;
  if (f.priority) where.priority = f.priority;
  if (f.target) where.targetId = f.target;
  if (f.assignee === "unassigned") where.assignedTo = { isEmpty: true };
  else if (f.assignee) where.assignedTo = { has: f.assignee };
  if (f.q) {
    const contains = { contains: f.q, mode: "insensitive" as const };
    where.OR = [
      { title: contains },
      { message: contains },
      { targetName: contains },
      { adminNotes: contains },
      { email: contains },
      { user: { is: { name: contains } } },
      { user: { is: { email: contains } } },
    ];
    const n = Number(f.q.replace(/^th-?/i, ""));
    if (Number.isInteger(n) && n > 0) where.OR.push({ ticketNo: n });
  }
  // "resolved" is derived from history, so it is filtered after loading.
  const column = f.basis === "updated" ? "updatedAt" : "createdAt";
  if (f.basis !== "resolved" && (f.from || f.to)) {
    where[column] = {
      ...(f.from ? { gte: dayStart(f.from) } : {}),
      ...(f.to ? { lt: dayEndExclusive(f.to) } : {}),
    };
  }

  const now = Date.now();
  let rows = (
    await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } }, events: true },
    })
  ).map((t) => toRow(t, now));

  if (f.basis === "resolved") {
    rows = rows.filter((r) => {
      if (!r.resolvedAt) return false;
      if (f.from && r.resolvedAt < dayStart(f.from)) return false;
      if (f.to && r.resolvedAt >= dayEndExclusive(f.to)) return false;
      return true;
    });
  }
  return rows;
}

export async function loadTicket(id: string): Promise<TicketRow | null> {
  const t = await prisma.feedback.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } }, events: true },
  });
  return t ? toRow(t, Date.now()) : null;
}

/** Distinct tools/areas that have feedback, for the filter dropdown. */
export async function loadTargets(): Promise<{ id: string; name: string }[]> {
  const g = await prisma.feedback.groupBy({
    by: ["targetId", "targetName"],
    orderBy: { targetName: "asc" },
  });
  return g.map((x) => ({ id: x.targetId, name: x.targetName }));
}

/* ------------------------------- summary -------------------------------- */

export type Count = { key: string; label: string; count: number };

export type Summary = {
  total: number;
  open: number;
  resolved: number;
  dismissed: number;
  resolutionRate: number; // 0..1 of (resolved / (total - dismissed))
  avgResolveMs: number | null;
  medianResolveMs: number | null;
  bugs: { total: number; open: number; resolved: number; avgFixMs: number | null };
  suggestions: number;
  urgentOpen: number; // critical + high, still open
  oldestOpenMs: number | null;
  byStatus: Count[];
  byKind: Count[];
  byPriority: Count[];
  byTool: Count[];
  /** Tickets per person (a ticket shared by two people counts for both). */
  byAssignee: (Count & { open: number; resolved: number })[];
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function tally<T extends string>(
  rows: TicketRow[],
  order: readonly T[],
  get: (r: TicketRow) => T,
  label: (k: T) => string
): Count[] {
  return order.map((k) => ({ key: k, label: label(k), count: rows.filter((r) => get(r) === k).length }));
}

export function summarize(rows: TicketRow[]): Summary {
  const resolvedRows = rows.filter((r) => r.status === "DONE");
  const dismissed = rows.filter((r) => r.status === "DISMISSED").length;
  const openRows = rows.filter((r) => r.openForMs !== null);
  const resolveTimes = resolvedRows.map((r) => r.timeToResolveMs ?? 0);
  const bugs = rows.filter((r) => r.kind === "BUG");
  const bugFix = bugs.filter((r) => r.status === "DONE").map((r) => r.timeToResolveMs ?? 0);

  const tools = new Map<string, number>();
  for (const r of rows) tools.set(r.tool, (tools.get(r.tool) ?? 0) + 1);

  const people = new Map<string, { count: number; open: number; resolved: number }>();
  const bump = (name: string, r: TicketRow) => {
    const e = people.get(name) ?? { count: 0, open: 0, resolved: 0 };
    e.count++;
    if (r.openForMs !== null) e.open++;
    if (r.status === "DONE") e.resolved++;
    people.set(name, e);
  };
  for (const r of rows) {
    if (r.assignedTo.length === 0) bump("Unassigned", r);
    else r.assignedTo.forEach((n) => bump(n, r));
  }

  const considered = rows.length - dismissed;
  return {
    total: rows.length,
    open: openRows.length,
    resolved: resolvedRows.length,
    dismissed,
    resolutionRate: considered > 0 ? resolvedRows.length / considered : 0,
    avgResolveMs: avg(resolveTimes),
    medianResolveMs: median(resolveTimes),
    bugs: {
      total: bugs.length,
      open: bugs.filter((r) => r.openForMs !== null).length,
      resolved: bugFix.length,
      avgFixMs: avg(bugFix),
    },
    suggestions: rows.filter((r) => r.kind !== "BUG").length,
    urgentOpen: openRows.filter((r) => r.priority === "CRITICAL" || r.priority === "HIGH").length,
    oldestOpenMs: openRows.length ? Math.max(...openRows.map((r) => r.openForMs ?? 0)) : null,
    byStatus: tally(rows, ["NEW", "REVIEWING", "PLANNED", "DONE", "DISMISSED"] as const, (r) => r.status, (k) => STATUS_LABEL[k]),
    byKind: tally(rows, ["BUG", "SUGGESTION", "IDEA"] as const, (r) => r.kind, (k) => KIND_LABEL[k]),
    byPriority: tally(rows, ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const, (r) => r.priority, (k) => PRIORITY_LABEL[k]),
    byTool: [...tools.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([name, count]) => ({ key: name, label: name, count })),
    byAssignee: [...people.entries()]
      .sort((a, b) => (a[0] === "Unassigned" ? 1 : b[0] === "Unassigned" ? -1 : b[1].count - a[1].count || a[0].localeCompare(b[0])))
      .map(([name, v]) => ({ key: name, label: name, ...v })),
  };
}

/* ------------------------------ formatting ------------------------------ */

/** "2d 4h", "5h 12m", "9m". */
export function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "< 1m";
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}

// Reports are in UTC so the same range always gives the same numbers,
// whichever server or laptop produces them.
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
});
export const fmtDate = (d: Date | null | undefined) => (d ? dateFmt.format(d) : "—");
export const fmtDateTime = (d: Date | null | undefined) => (d ? `${dateTimeFmt.format(d)} UTC` : "—");
export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function periodLabel(f: FeedbackFilters): string {
  const basis = { raised: "raised", resolved: "resolved", updated: "last updated" }[f.basis];
  if (!f.from && !f.to) return `All time (by ${basis} date)`;
  const a = f.from ? fmtDate(dayStart(f.from)) : "the beginning";
  const b = f.to ? fmtDate(dayStart(f.to)) : "today";
  return `${a} to ${b} (by ${basis} date)`;
}

export function filterSummary(f: FeedbackFilters, targetName?: string): string[] {
  const out: string[] = [];
  if (f.kind) out.push(`Type: ${KIND_LABEL[f.kind]}`);
  if (f.status) out.push(`Status: ${STATUS_LABEL[f.status]}`);
  if (f.priority) out.push(`Priority: ${PRIORITY_LABEL[f.priority]}`);
  if (f.target) out.push(`Tool: ${targetName ?? f.target}`);
  if (f.assignee) out.push(`Assigned to: ${f.assignee === "unassigned" ? "Unassigned" : f.assignee}`);
  if (f.q) out.push(`Search: "${f.q}"`);
  return out;
}

export function reportFileName(f: FeedbackFilters, ext: "xlsx" | "pdf"): string {
  const range = f.from || f.to ? `_${f.from ?? "start"}_to_${f.to ?? "today"}` : "_all-time";
  return `tools-hub-feedback-report${range}.${ext}`;
}
