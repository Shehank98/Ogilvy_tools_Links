import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { ActionForm } from "@/components/ActionForm";
import { Field, Select, TextArea } from "@/components/fields";
import { deleteFeedback, updateFeedback } from "@/lib/actions/feedback";
import { PRIORITY_LABEL, STATUS_LABEL, ticketCode } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const kindLabels: Record<string, string> = {
  SUGGESTION: "Suggestion",
  IDEA: "Idea / feature",
  BUG: "Bug / problem",
};

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.feedback.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!item) notFound();

  const action = updateFeedback.bind(null, item.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/feedback"
          className="text-sm font-medium text-brand hover:text-brand-dark"
        >
          ← All feedback
        </Link>
        <form action={deleteFeedback}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </form>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {item.title ?? item.targetName}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {ticketCode(item.ticketNo)} · {item.targetName} ·{" "}
              {PRIORITY_LABEL[item.priority]} priority · 
              {kindLabels[item.kind] ?? item.kind} ·{" "}
              {dateFormat.format(item.createdAt)}
            </p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">
          {item.message}
        </p>
        {item.steps && (
          <>
            <p className="mt-4 text-sm font-semibold text-gray-900">
              Steps to reproduce
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {item.steps}
            </p>
          </>
        )}
        {item.user && (
          <p className="mt-4 text-sm text-gray-500">
            Raised by {item.user.name}
          </p>
        )}
        {item.email && (
          <p className="mt-4 text-sm text-gray-500">
            Reply to:{" "}
            <a
              href={`mailto:${item.email}`}
              className="text-brand underline hover:text-brand-dark"
            >
              {item.email}
            </a>
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Update status
        </h2>
        <ActionForm action={action} submitLabel="Save">
          <Field label="Status">
            <Select name="status" defaultValue={item.status}>
              <option value="NEW">New</option>
              <option value="REVIEWING">Reviewing</option>
              <option value="PLANNED">Planned</option>
              <option value="DONE">Done</option>
              <option value="DISMISSED">Dismissed</option>
            </Select>
          </Field>
          <Field
            label="Note to requester (optional)"
            hint="Shown to the requester on their ticket."
          >
            <TextArea
              name="publicNote"
              rows={3}
              defaultValue={item.publicNote ?? ""}
            />
          </Field>
          <Field label="Internal notes (optional)" hint="Only visible to admins.">
            <TextArea name="adminNotes" defaultValue={item.adminNotes ?? ""} />
          </Field>
          {(item.user || item.email) && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="notify" defaultChecked />
              Email the requester about this update
            </label>
          )}
        </ActionForm>
      </Card>

      {item.events.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">History</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {item.events.map((e) => (
              <li key={e.id} className="flex gap-3 py-2">
                <time className="w-44 shrink-0 text-gray-500">
                  {dateFormat.format(e.createdAt)}
                </time>
                <span>
                  <strong>{STATUS_LABEL[e.status]}</strong>
                  {e.note ? ` · ${e.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
