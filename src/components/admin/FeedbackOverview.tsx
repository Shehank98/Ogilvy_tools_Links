import Link from "next/link";
import { Card } from "@/components/Card";
import { CountUp } from "@/components/CountUp";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import {
  fmtDate,
  fmtDuration,
  type Summary,
  type TicketRow,
} from "@/lib/feedback-report";

const STATUS_BAR: Record<string, string> = {
  NEW: "bg-blue-500",
  REVIEWING: "bg-amber-500",
  PLANNED: "bg-brand",
  DONE: "bg-emerald-500",
  DISMISSED: "bg-gray-400",
};

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;

export function Stat({
  label,
  value,
  sub,
  accent,
  index = 0,
  suffix,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  index?: number;
  suffix?: string;
}) {
  return (
    <Card
      style={delay(index)}
      className={`anim-fade-up stagger !p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${accent ? "border-t-4 border-t-brand" : ""}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {typeof value === "number" ? <CountUp to={value} suffix={suffix} /> : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </Card>
  );
}

export function KpiGrid({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Stat index={0} label="Total tickets" value={summary.total} sub={`${summary.bugs.total} bugs · ${summary.suggestions} suggestions/ideas`} />
      <Stat index={1} label="Open" value={summary.open} sub={`${summary.urgentOpen} critical / high`} accent={summary.urgentOpen > 0} />
      <Stat index={2} label="Resolved" value={summary.resolved} sub={`${summary.dismissed} closed without action`} />
      <Stat index={3} label="Resolution rate" value={Math.round(summary.resolutionRate * 100)} suffix="%" sub="of tickets not closed" />
      <Stat index={4} label="Avg time to resolve" value={fmtDuration(summary.avgResolveMs)} sub={`median ${fmtDuration(summary.medianResolveMs)}`} />
      <Stat index={5} label="Bugs fixed" value={`${summary.bugs.resolved} / ${summary.bugs.total}`} sub={`avg fix ${fmtDuration(summary.bugs.avgFixMs)}`} />
    </div>
  );
}

/** Status bar + priority counts, next to the busiest tools. */
export function BreakdownRow({ summary }: { summary: Summary }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h2 className="text-sm font-semibold text-gray-900">Status distribution</h2>
        {summary.total === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No tickets in this selection.</p>
        ) : (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-gray-100">
              {summary.byStatus.filter((s) => s.count).map((s, i) => (
                <div
                  key={s.key}
                  title={`${s.label}: ${s.count}`}
                  className={`anim-grow-x ${STATUS_BAR[s.key]}`}
                  style={{ width: `${(s.count / summary.total) * 100}%`, animationDelay: `${0.1 + i * 0.12}s` }}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
              {summary.byStatus.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_BAR[s.key]}`} />
                  {s.label} <strong className="text-gray-900">{s.count}</strong>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs text-gray-600 sm:grid-cols-4">
              {summary.byPriority.map((p) => (
                <div key={p.key}>
                  <PriorityBadge priority={p.key} label={p.label} />{" "}
                  <strong className="ml-1 text-gray-900">{p.count}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
      <Card>
        <h2 className="text-sm font-semibold text-gray-900">Most feedback by tool</h2>
        {summary.byTool.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Nothing yet.</p>
        ) : (
          <ol className="mt-2 space-y-1.5 text-sm">
            {summary.byTool.slice(0, 5).map((t) => (
              <li key={t.key} className="flex items-center justify-between gap-3">
                <span className="truncate text-gray-700">{t.label}</span>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{t.count}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

/** Who is carrying what: open and resolved tickets per team member. */
export function WorkloadCard({ summary, baseQuery = "" }: { summary: Summary; baseQuery?: string }) {
  const rows = summary.byAssignee;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <h2 className="text-sm font-semibold text-gray-900">Workload by person</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No tickets yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r, i) => {
            const who = r.label === "Unassigned" ? "unassigned" : r.label;
            return (
              <li key={r.key} className="anim-slide-in stagger" style={delay(i)}>
                <Link
                  href={`/admin/feedback?${baseQuery}${baseQuery ? "&" : ""}assignee=${encodeURIComponent(who)}`}
                  className="group block"
                >
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className={`truncate group-hover:text-brand-dark ${r.label === "Unassigned" ? "italic text-gray-500" : "font-medium text-gray-800"}`}>
                      {r.label}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">
                      <strong className="text-gray-900">{r.open}</strong> open · {r.resolved} done
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`anim-grow-x h-full rounded-full ${r.label === "Unassigned" ? "bg-gray-400" : "bg-brand"}`}
                      style={{ width: `${(r.count / max) * 100}%`, animationDelay: `${0.15 + i * 0.07}s` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** The latest tickets, newest first, each linking to its page. */
export function RecentTickets({ rows, limit = 8 }: { rows: TicketRow[]; limit?: number }) {
  const list = rows.slice(0, limit);
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Latest tickets</h2>
        <Link href="/admin/feedback" className="text-sm font-medium text-brand hover:text-brand-dark">
          Open the feedback console →
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500">No tickets yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {["Ticket", "Title", "Priority", "Status", "Assigned to", "Raised", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((t, i) => (
                <tr key={t.id} style={delay(i)} className="anim-fade-up stagger transition-colors hover:bg-red-50/40">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-semibold text-gray-500">{t.code}</td>
                  <td className="max-w-xs px-4 py-2.5">
                    <Link href={`/admin/feedback/${t.id}`} className="line-clamp-1 font-medium text-gray-900 hover:text-brand-dark">{t.title}</Link>
                    <p className="line-clamp-1 text-xs text-gray-500">{t.kindLabel} · {t.tool}</p>
                  </td>
                  <td className="px-4 py-2.5"><PriorityBadge priority={t.priority} label={t.priorityLabel} /></td>
                  <td className="px-4 py-2.5"><StatusBadge status={t.status} label={t.statusLabel} /></td>
                  <td className="max-w-[10rem] px-4 py-2.5 text-xs text-gray-700">
                    {t.assignedTo.length ? t.assignedTo.join(", ") : <span className="text-gray-400">Unassigned</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{fmtDate(t.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/admin/feedback/${t.id}`} className="text-sm font-medium text-brand hover:text-brand-dark">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
