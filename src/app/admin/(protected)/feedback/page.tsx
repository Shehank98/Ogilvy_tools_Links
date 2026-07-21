import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTable } from "@/components/AdminTable";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const kindLabels: Record<string, string> = {
  SUGGESTION: "Suggestion",
  IDEA: "Idea",
  BUG: "Bug",
};

export default async function AdminFeedbackPage() {
  const feedback = await prisma.feedback.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="mt-1 text-sm text-gray-500">
          Suggestions, ideas, and bug reports left on tool and coming-soon
          cards.
        </p>
      </div>

      <AdminTable
        rows={feedback}
        emptyMessage="No feedback yet."
        columns={[
          {
            header: "About",
            cell: (f) => (
              <div>
                <p className="font-medium text-gray-900">{f.targetName}</p>
                <p className="text-xs text-gray-400">
                  {f.targetType === "UPCOMING" ? "Coming soon" : "Tool"}
                </p>
              </div>
            ),
          },
          { header: "Type", cell: (f) => kindLabels[f.kind] ?? f.kind },
          {
            header: "Message",
            cell: (f) => (
              <span className="line-clamp-2 max-w-xs text-gray-700">
                {f.message}
              </span>
            ),
          },
          { header: "Date", cell: (f) => dateFormat.format(f.createdAt) },
          { header: "Status", cell: (f) => <StatusBadge status={f.status} /> },
          {
            header: "",
            className: "text-right",
            cell: (f) => (
              <Link
                href={`/admin/feedback/${f.id}`}
                className="text-sm font-medium text-brand hover:text-brand-dark"
              >
                Review
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
