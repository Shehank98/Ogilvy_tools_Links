import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTable } from "@/components/AdminTable";
import { deleteUpcoming } from "@/lib/actions/upcoming";
import { resolveImageUrl } from "@/lib/image";

export const dynamic = "force-dynamic";

export default async function AdminUpcomingPage() {
  const items = await prisma.upcoming.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coming Soon</h1>
          <p className="mt-1 text-sm text-gray-500">
            Non-clickable “Coming soon” cards shown on the landing page.
          </p>
        </div>
        <Link
          href="/admin/upcoming/new"
          className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Add item
        </Link>
      </div>

      <AdminTable
        rows={items}
        emptyMessage="Nothing upcoming yet — add a coming-soon item."
        columns={[
          {
            header: "Name",
            cell: (item) => (
              <div className="flex items-center gap-2">
                {item.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(item.bannerUrl) ?? ""}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-7 w-10 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-10 items-center justify-center rounded bg-neutral-800 text-xs font-bold text-white">
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="font-medium text-gray-900">{item.name}</span>
              </div>
            ),
          },
          { header: "Category", cell: (item) => item.category ?? "—" },
          { header: "Order", cell: (item) => item.order },
          {
            header: "Status",
            cell: (item) => (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  item.isActive
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.isActive ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            header: "",
            className: "text-right",
            cell: (item) => (
              <div className="flex justify-end gap-2">
                <Link
                  href={`/admin/upcoming/${item.id}`}
                  className="text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Edit
                </Link>
                <form action={deleteUpcoming}>
                  <input type="hidden" name="id" value={item.id} />
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
