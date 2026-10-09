import Link from "next/link";
import { Card } from "@/components/Card";
import { BreakdownRow, KpiGrid, WorkloadCard } from "@/components/admin/FeedbackOverview";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import {
  filtersToQuery,
  fmtDate,
  fmtDuration,
  loadTargets,
  loadTickets,
  parseFilters,
  summarize,
  type FeedbackFilters,
} from "@/lib/feedback-report";
import { STATUS_LABEL } from "@/lib/tickets";
import { ASSIGNEES } from "@/lib/team";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

function presets() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthEnd = addDays(monthStart, -1);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return [
    { label: "Last 7 days", from: iso(addDays(today, -6)), to: iso(today) },
    { label: "Last 30 days", from: iso(addDays(today, -29)), to: iso(today) },
    { label: "This month", from: iso(monthStart), to: iso(today) },
    { label: "Last month", from: iso(lastMonthStart), to: iso(lastMonthEnd) },
    { label: "This year", from: iso(yearStart), to: iso(today) },
    { label: "All time", from: "", to: "" },
  ];
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters: FeedbackFilters = parseFilters(sp);
  const rangeError = filters.from && filters.to && filters.from > filters.to;

  const [rows, targets] = await Promise.all([
    loadTickets(rangeError ? { ...filters, from: undefined, to: undefined } : filters),
    loadTargets(),
  ]);
  const summary = summarize(rows);

  const page = Math.max(1, Math.min(Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1, Math.ceil(rows.length / PAGE_SIZE) || 1));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const q = (extra: Record<string, string> = {}) => filtersToQuery(filters, extra);
  const hasFilters = !!(filters.from || filters.to || filters.status || filters.kind || filters.priority || filters.target || filters.assignee || filters.q || filters.basis !== "raised");

  return (
    <div className="space-y-6">
      {/* Header + exports */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback &amp; Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bug reports, suggestions and ideas from staff. Filter by date range, then export a report.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/admin/feedback-export?${q({ format: "xlsx" })}`}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            <span aria-hidden>⬇</span> Excel report
          </a>
          <a
            href={`/api/admin/feedback-export?${q({ format: "pdf" })}`}
            className="inline-flex items-center gap-2 rounded-md border border-brand bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
          >
            <span aria-hidden>⬇</span> PDF report
          </a>
        </div>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <form method="get" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-gray-600">
              From
              <input type="date" name="from" defaultValue={filters.from ?? ""} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-xs font-medium text-gray-600">
              To
              <input type="date" name="to" defaultValue={filters.to ?? ""} className={`${inputClass} mt-1`} />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Date means
              <select name="basis" defaultValue={filters.basis} className={`${inputClass} mt-1`}>
                <option value="raised">Date raised</option>
                <option value="resolved">Date resolved / fixed</option>
                <option value="updated">Last updated</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Search
              <input type="search" name="q" defaultValue={filters.q ?? ""} placeholder="Ticket no, title, person…" className={`${inputClass} mt-1`} />
            </label>
            <label className="text-xs font-medium text-gray-600">
              Type
              <select name="kind" defaultValue={filters.kind ?? ""} className={`${inputClass} mt-1`}>
                <option value="">All types</option>
                <option value="BUG">Bug</option>
                <option value="SUGGESTION">Suggestion</option>
                <option value="IDEA">Idea</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Status
              <select name="status" defaultValue={filters.status ?? ""} className={`${inputClass} mt-1`}>
                <option value="">All statuses</option>
                {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Priority
              <select name="priority" defaultValue={filters.priority ?? ""} className={`${inputClass} mt-1`}>
                <option value="">All priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Assigned to
              <select name="assignee" defaultValue={filters.assignee ?? ""} className={`${inputClass} mt-1`}>
                <option value="">Everyone</option>
                <option value="unassigned">Unassigned</option>
                {ASSIGNEES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Tool / area
              <select name="target" defaultValue={filters.target ?? ""} className={`${inputClass} mt-1`}>
                <option value="">All tools</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-black">
              Apply filters
            </button>
            {hasFilters && (
              <Link href="/admin/feedback" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Reset
              </Link>
            )}
            <span className="ml-2 text-xs text-gray-500">Quick range:</span>
            {presets().map((p) => (
              <Link
                key={p.label}
                href={`/admin/feedback?${filtersToQuery({ ...filters, from: p.from || undefined, to: p.to || undefined })}`}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  (filters.from ?? "") === p.from && (filters.to ?? "") === p.to
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
          {rangeError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              The start date is after the end date, so the date range was ignored.
            </p>
          )}
        </form>
      </Card>

      {/* KPIs */}
      <KpiGrid summary={summary} />

      {/* Breakdowns + who is working on what */}
      <BreakdownRow summary={summary} />
      <WorkloadCard summary={summary} baseQuery={q()} />

      {/* Table */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {rows.length === 0
            ? "No tickets match."
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + visible.length} of ${rows.length}`}
        </span>
        <span>Dates and times are in UTC</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          No tickets match these filters. Try a wider date range.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {["Ticket", "Type", "Title", "Priority", "Status", "Assigned to", "Raised", "Resolution", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((t, i) => (
                <tr
                  key={t.id}
                  style={{ "--i": i } as React.CSSProperties}
                  className="anim-fade-up stagger transition-colors hover:bg-red-50/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-gray-500">{t.code}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${t.kind === "BUG" ? "bg-gray-900 text-white" : "border border-gray-900 text-gray-900"}`}>
                      {t.kindLabel}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <Link href={`/admin/feedback/${t.id}`} className="line-clamp-1 font-medium text-gray-900 hover:text-brand-dark">
                      {t.title}
                    </Link>
                    <p className="line-clamp-1 text-xs text-gray-500">
                      {t.tool}
                      {t.reporterName || t.reporterEmail ? ` · ${t.reporterName || t.reporterEmail}` : ""}
                      {t.fileCount > 0 && (
                        <span className="ml-1.5 rounded bg-gray-100 px-1 py-px text-[11px] font-medium text-gray-700" title={`${t.fileCount} attachment${t.fileCount === 1 ? "" : "s"}`}>
                          📎 {t.fileCount}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} label={t.priorityLabel} /></td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} label={t.statusLabel} /></td>
                  <td className="max-w-[11rem] px-4 py-3 text-xs text-gray-700">
                    {t.assignedTo.length ? t.assignedTo.join(", ") : <span className="text-gray-400">Unassigned</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{fmtDate(t.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {t.resolvedAt ? (
                      <span className="text-emerald-700">
                        Fixed in <strong>{fmtDuration(t.timeToResolveMs)}</strong>
                        <span className="block text-gray-500">{fmtDate(t.resolvedAt)}</span>
                      </span>
                    ) : t.openForMs !== null ? (
                      <span className="text-gray-600">Open <strong>{fmtDuration(t.openForMs)}</strong></span>
                    ) : (
                      <span className="text-gray-400">Closed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/feedback/${t.id}`} className="text-sm font-medium text-brand hover:text-brand-dark">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50" href={`/admin/feedback?${q({ page: String(page - 1) })}`}>← Previous</Link>
          )}
          <span className="px-2 text-gray-500">Page {page} of {Math.ceil(rows.length / PAGE_SIZE)}</span>
          {page * PAGE_SIZE < rows.length && (
            <Link className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50" href={`/admin/feedback?${q({ page: String(page + 1) })}`}>Next →</Link>
          )}
        </div>
      )}
    </div>
  );
}
