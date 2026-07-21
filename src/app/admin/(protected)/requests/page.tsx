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

export default async function AdminRequestsPage() {
  const requests = await prisma.toolRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tool Requests</h1>

      <AdminTable
        rows={requests}
        emptyMessage="No tool requests yet."
        columns={[
          {
            header: "Tool idea",
            cell: (req) => (
              <span className="font-medium text-gray-900">{req.toolName}</span>
            ),
          },
          {
            header: "Requester",
            cell: (req) => (
              <div>
                <p>{req.requesterName}</p>
                <p className="text-xs text-gray-500">{req.requesterEmail}</p>
              </div>
            ),
          },
          {
            header: "Frequency",
            cell: (req) => req.frequency.toLowerCase(),
          },
          {
            header: "Submitted",
            cell: (req) => dateFormat.format(req.createdAt),
          },
          {
            header: "Status",
            cell: (req) => <StatusBadge status={req.status} />,
          },
          {
            header: "",
            className: "text-right",
            cell: (req) => (
              <Link
                href={`/admin/requests/${req.id}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
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
