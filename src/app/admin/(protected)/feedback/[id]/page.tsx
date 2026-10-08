import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { ActionForm } from "@/components/ActionForm";
import { Field, Select, TextArea } from "@/components/fields";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { deleteFeedback, updateFeedback } from "@/lib/actions/feedback";
import { fmtDateTime, fmtDuration, loadTicket } from "@/lib/feedback-report";
import { PROGRESS_STEPS, STATUS_LABEL } from "@/lib/tickets";

export const dynamic = "force-dynamic";

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await loadTicket(id);
  if (!t) notFound();

  const action = updateFeedback.bind(null, t.id);
  const idx = PROGRESS_STEPS.indexOf(t.status);
  const closed = t.status === "DISMISSED";
  const hasRequester = !!t.reporterEmail;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/feedback" className="text-sm font-medium text-brand hover:text-brand-dark">
          ← All feedback
        </Link>
        <form action={deleteFeedback}>
          <input type="hidden" name="id" value={t.id} />
          <button type="submit" className="text-sm font-medium text-red-600 hover:text-red-800">
            Delete ticket
          </button>
        </form>
      </div>

      {/* Header */}
      <Card className="!p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold tracking-wider text-gray-500">{t.code}</span>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${t.kind === "BUG" ? "bg-gray-900 text-white" : "border border-gray-900 text-gray-900"}`}>
            {t.kindLabel}
          </span>
          <PriorityBadge priority={t.priority} label={`${t.priorityLabel} priority`} />
          <span className="ml-auto"><StatusBadge status={t.status} label={t.statusLabel} /></span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">{t.title}</h1>

        <dl className="mt-5 grid gap-x-8 gap-y-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Tool / area">{t.tool}</Meta>
          <Meta label="Raised by">
            {t.reporterName || t.reporterEmail ? (
              <>
                {t.reporterName && <span className="block">{t.reporterName}</span>}
                {t.reporterEmail && (
                  <a href={`mailto:${t.reporterEmail}`} className="text-xs text-brand underline hover:text-brand-dark">{t.reporterEmail}</a>
                )}
              </>
            ) : (
              <span className="text-gray-400">Anonymous (before accounts)</span>
            )}
          </Meta>
          <Meta label="Raised">{fmtDateTime(t.createdAt)}</Meta>
          <Meta label="Last updated">{fmtDateTime(t.updatedAt)}</Meta>
          <Meta label={t.resolvedAt ? "Resolved" : "Open for"}>
            {t.resolvedAt ? fmtDateTime(t.resolvedAt) : t.openForMs !== null ? fmtDuration(t.openForMs) : "Closed"}
          </Meta>
          <Meta label="Time to resolve">
            {t.timeToResolveMs !== null ? <strong className="text-emerald-700">{fmtDuration(t.timeToResolveMs)}</strong> : "—"}
          </Meta>
          <Meta label="Updates">{Math.max(0, t.events.length - 1)}</Meta>
        </dl>

        {closed ? (
          <p className="mt-5 text-sm italic text-gray-500">This ticket was closed without action.</p>
        ) : (
          <ol className="mt-6 flex" aria-label="Progress">
            {PROGRESS_STEPS.map((s, i) => (
              <li key={s} className={`relative flex-1 text-center text-[11px] ${i === idx ? "font-bold text-gray-900" : "text-gray-500"}`}>
                {i > 0 && <span className={`absolute left-[-50%] top-[6px] h-0.5 w-full ${i <= idx ? "bg-gray-900" : "bg-gray-200"}`} />}
                <span className={`relative z-10 mx-auto mb-1.5 block h-3.5 w-3.5 rounded-full border-2 ${i < idx ? "border-gray-900 bg-gray-900" : i === idx ? "border-brand bg-brand ring-4 ring-brand/15" : "border-gray-300 bg-white"}`} />
                {STATUS_LABEL[s]}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: content */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t.kind === "BUG" ? "What went wrong" : "The suggestion"}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{t.description}</p>
            {t.steps && (
              <>
                <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Steps to reproduce</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{t.steps}</p>
              </>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t.kind === "BUG" ? "Fix details (visible to the requester)" : "Response (visible to the requester)"}
            </h2>
            {t.requesterNote ? (
              <p className="mt-2 whitespace-pre-wrap rounded-md border-l-4 border-brand bg-gray-50 px-4 py-3 text-sm text-gray-800">{t.requesterNote}</p>
            ) : (
              <p className="mt-2 text-sm text-gray-400">Nothing written yet. Add it in the update form.</p>
            )}
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-gray-500">Internal notes (admins only)</h2>
            {t.internalNotes ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{t.internalNotes}</p>
            ) : (
              <p className="mt-2 text-sm text-gray-400">None.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">History</h2>
            {t.events.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No history was recorded for this older ticket.</p>
            ) : (
              <ol className="mt-3 space-y-0">
                {[...t.events].reverse().map((e, i) => (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                    <span className="absolute left-[4px] top-4 h-full w-px bg-gray-200 last:hidden" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{e.statusLabel}</p>
                      {e.note && <p className="whitespace-pre-wrap text-gray-600">{e.note}</p>}
                      <p className="text-xs text-gray-400">{fmtDateTime(e.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Right: update */}
        <div>
          <Card className="sticky top-4">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Update ticket</h2>
            <ActionForm action={action} submitLabel="Save update">
              <Field label="Status">
                <Select name="status" defaultValue={t.status}>
                  {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </Select>
              </Field>
              <Field
                label={t.kind === "BUG" ? "Fix details / note to requester" : "Note to requester"}
                hint={t.kind === "BUG" ? "What was wrong and how it was fixed. Shown to the requester and included in the bug-fix reports." : "Shown to the requester on their ticket."}
              >
                <TextArea name="publicNote" rows={4} defaultValue={t.requesterNote} />
              </Field>
              <Field label="Internal notes" hint="Only visible to admins.">
                <TextArea name="adminNotes" rows={3} defaultValue={t.internalNotes} />
              </Field>
              {hasRequester && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="notify" defaultChecked />
                  Email {t.reporterName || "the requester"} about this update
                </label>
              )}
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}
