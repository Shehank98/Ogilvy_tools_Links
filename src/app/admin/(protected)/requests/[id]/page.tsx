import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { ActionForm } from "@/components/ActionForm";
import { Field, Select, TextArea } from "@/components/fields";
import { updateToolRequest } from "@/lib/actions/requests";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await prisma.toolRequest.findUnique({ where: { id } });
  if (!request) notFound();

  const action = updateToolRequest.bind(null, request.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/requests"
        className="text-sm font-medium text-brand hover:text-brand-dark"
      >
        ← All requests
      </Link>

      <Card>
        <h1 className="text-xl font-bold text-gray-900">{request.toolName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Requested by {request.requesterName} ({request.requesterEmail}) on{" "}
          {dateFormat.format(request.createdAt)}
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-gray-700">Task it should solve</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-gray-600">
              {request.taskDescription}
            </dd>
          </div>
          <div className="flex gap-8">
            <div>
              <dt className="font-medium text-gray-700">Frequency</dt>
              <dd className="mt-0.5 capitalize text-gray-600">
                {request.frequency.toLowerCase()}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Manual time</dt>
              <dd className="mt-0.5 text-gray-600">
                {request.estimatedTimeSaved ?? "—"}
              </dd>
            </div>
          </div>
          {request.attachmentUrl && (
            <div>
              <dt className="font-medium text-gray-700">Attachment</dt>
              <dd className="mt-0.5">
                <a
                  href={request.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline hover:text-brand-dark"
                >
                  {request.attachmentUrl}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Update request
        </h2>
        <ActionForm action={action} submitLabel="Save">
          <Field label="Status">
            <Select name="status" defaultValue={request.status}>
              <option value="NEW">New</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="BUILT">Built</option>
            </Select>
          </Field>
          <Field
            label="Admin notes (optional)"
            hint="Visible to the requester on the status page"
          >
            <TextArea
              name="adminNotes"
              defaultValue={request.adminNotes ?? ""}
            />
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
