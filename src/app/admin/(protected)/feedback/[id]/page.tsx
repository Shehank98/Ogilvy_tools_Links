import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { ActionForm } from "@/components/ActionForm";
import { Field, Select, TextArea } from "@/components/fields";
import { deleteFeedback, updateFeedback } from "@/lib/actions/feedback";

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
  const item = await prisma.feedback.findUnique({ where: { id } });
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
              {item.targetName}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {item.targetType === "UPCOMING" ? "Coming soon" : "Tool"} ·{" "}
              {kindLabels[item.kind] ?? item.kind} ·{" "}
              {dateFormat.format(item.createdAt)}
            </p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">
          {item.message}
        </p>
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
          <Field label="Internal notes (optional)">
            <TextArea name="adminNotes" defaultValue={item.adminNotes ?? ""} />
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
