import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";
import { Card, EmptyState } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function RequestStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (!FEATURES.requests) redirect("/");
  const { email } = await searchParams;
  const requests = email
    ? await prisma.toolRequest.findMany({
        where: { requesterEmail: { equals: email.trim(), mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Check Request Status
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter the email you used when submitting your request.{" "}
          <Link
            href="/request"
            className="font-medium text-brand hover:text-brand-dark"
          >
            Submit a new request
          </Link>
          .
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="email"
          name="email"
          defaultValue={email ?? ""}
          placeholder="you@company.com"
          required
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Look up
        </button>
      </form>

      {requests && requests.length === 0 && (
        <EmptyState message={`No requests found for ${email}.`} />
      )}

      {requests && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{req.toolName}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Submitted {dateFormat.format(req.createdAt)}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <p className="mt-3 text-sm text-gray-600">{req.taskDescription}</p>
              {req.adminNotes && (
                <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">
                    Note from the team:
                  </span>{" "}
                  {req.adminNotes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
