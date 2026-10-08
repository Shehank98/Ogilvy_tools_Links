import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";
import { requireUser } from "@/lib/user-auth";
import { EmptyState } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  KIND_LABEL,
  PRIORITY_LABEL,
  PROGRESS_STEPS,
  STATUS_LABEL,
  ticketCode,
} from "@/lib/tickets";

export const dynamic = "force-dynamic";

const dt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  if (!FEATURES.userLogin) redirect("/");
  const user = (await requireUser())!;
  const { new: justRaised } = await searchParams;

  const tickets = await prisma.feedback.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { events: { orderBy: { createdAt: "desc" } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
          <p className="mt-1 text-sm text-gray-600">
            Everything you&apos;ve raised, updated live as the team works on it.
          </p>
        </div>
        <Link
          href="/report"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Raise a ticket
        </Link>
      </div>

      {justRaised && (
        <p role="status" className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          <strong>{justRaised}</strong> raised. A confirmation email is on its way.
        </p>
      )}

      {tickets.length === 0 ? (
        <EmptyState message="You haven't raised any tickets yet." />
      ) : (
        tickets.map((t) => {
          const code = ticketCode(t.ticketNo);
          const idx = PROGRESS_STEPS.indexOf(t.status);
          const closed = t.status === "DISMISSED";
          return (
            <article
              key={t.id}
              className={`rounded-xl border bg-white p-5 shadow-sm ${
                code === justRaised ? "border-green-300" : "border-gray-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold tracking-wider text-gray-500">{code}</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-bold uppercase tracking-wide ${
                    t.kind === "BUG" ? "bg-black text-white" : "border border-black text-black"
                  }`}
                >
                  {KIND_LABEL[t.kind]}
                </span>
                <span className="text-gray-500">
                  {t.targetName} · {PRIORITY_LABEL[t.priority]} priority
                </span>
                <span className="ml-auto">
                  <StatusBadge status={t.status} label={STATUS_LABEL[t.status]} />
                </span>
              </div>
              <h2 className="mt-2 text-base font-semibold text-gray-900">
                {t.title ?? t.message.slice(0, 80)}
              </h2>
              <p className="text-xs text-gray-500">
                Raised {dt.format(t.createdAt)} · Last update {dt.format(t.updatedAt)}
              </p>

              {closed ? (
                <p className="mt-3 text-sm italic text-gray-500">
                  The Automation team has closed this ticket. See the note below.
                </p>
              ) : (
                <ol className="mt-4 flex" aria-label="Progress">
                  {PROGRESS_STEPS.map((s, i) => (
                    <li
                      key={s}
                      className={`relative flex-1 text-center text-[11px] ${
                        i === idx ? "font-bold text-black" : "text-gray-500"
                      }`}
                    >
                      {i > 0 && (
                        <span
                          className={`absolute left-[-50%] top-[6px] h-0.5 w-full ${
                            i <= idx ? "bg-black" : "bg-gray-200"
                          }`}
                        />
                      )}
                      <span
                        className={`relative z-10 mx-auto mb-1.5 block h-3.5 w-3.5 rounded-full border-2 ${
                          i < idx
                            ? "border-black bg-black"
                            : i === idx
                              ? "border-brand bg-brand ring-4 ring-brand/15"
                              : "border-gray-300 bg-white"
                        }`}
                      />
                      {STATUS_LABEL[s]}
                    </li>
                  ))}
                </ol>
              )}

              {t.publicNote && (
                <p className="mt-3 whitespace-pre-wrap rounded-md border-l-4 border-brand bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <strong>Automation team:</strong> {t.publicNote}
                </p>
              )}

              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-xs font-semibold text-gray-900">
                  Details &amp; history
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-gray-700">{t.message}</p>
                {t.steps && (
                  <>
                    <p className="mt-3 text-xs font-semibold text-gray-900">Steps to reproduce</p>
                    <p className="whitespace-pre-wrap text-gray-700">{t.steps}</p>
                  </>
                )}
                <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                  {t.events.map((e) => (
                    <li key={e.id} className="flex gap-3 py-1.5 text-xs">
                      <time className="w-36 shrink-0 text-gray-500">{dt.format(e.createdAt)}</time>
                      <span>
                        <strong>{STATUS_LABEL[e.status]}</strong>
                        {e.note ? ` · ${e.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          );
        })
      )}
    </div>
  );
}
