import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTable } from "@/components/AdminTable";
import { deleteNotice, toggleNoticeActive } from "@/lib/actions/notices";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const typeLabels: Record<string, string> = {
  INFO: "Info",
  UPDATE: "Update",
  BUGFIX: "Bug fix",
  WARNING: "Warning",
};

export default async function AdminNoticesPage() {
  const notices = await prisma.notice.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Full-width bar for updates, bug fixes, and announcements. The most
            recent active notice is shown on the site.
          </p>
        </div>
        <Link
          href="/admin/notices/new"
          className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + New notice
        </Link>
      </div>

      <AdminTable
        rows={notices}
        emptyMessage="No notices yet — create one to show a bar on the site."
        columns={[
          {
            header: "Message",
            cell: (n) => (
              <span className="line-clamp-2 max-w-md text-gray-900">
                {n.message}
              </span>
            ),
          },
          { header: "Type", cell: (n) => typeLabels[n.type] ?? n.type },
          { header: "Created", cell: (n) => dateFormat.format(n.createdAt) },
          {
            header: "Status",
            cell: (n) => (
              <form action={toggleNoticeActive}>
                <input type="hidden" name="id" value={n.id} />
                <button
                  type="submit"
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    n.isActive
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                  title="Click to toggle"
                >
                  {n.isActive ? "Active" : "Inactive"}
                </button>
              </form>
            ),
          },
          {
            header: "",
            className: "text-right",
            cell: (n) => (
              <div className="flex justify-end gap-2">
                <Link
                  href={`/admin/notices/${n.id}`}
                  className="text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Edit
                </Link>
                <form action={deleteNotice}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
