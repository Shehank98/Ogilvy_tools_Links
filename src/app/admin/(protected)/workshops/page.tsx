import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTable } from "@/components/AdminTable";
import { deleteWorkshop } from "@/lib/actions/workshops";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminWorkshopsPage() {
  const workshops = await prisma.workshop.findMany({
    orderBy: { dateTime: "desc" },
  });
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workshops</h1>
        <Link
          href="/admin/workshops/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Add workshop
        </Link>
      </div>

      <AdminTable
        rows={workshops}
        emptyMessage="No workshops yet. Schedule your first one."
        columns={[
          {
            header: "Title",
            cell: (w) => (
              <span className="font-medium text-gray-900">{w.title}</span>
            ),
          },
          {
            header: "When",
            cell: (w) => (
              <span className={w.dateTime < now ? "text-gray-400" : ""}>
                {dateFormat.format(w.dateTime)}
                {w.dateTime < now && " (past)"}
              </span>
            ),
          },
          { header: "Location", cell: (w) => w.location ?? "-" },
          { header: "Interested", cell: (w) => w.interestedCount },
          {
            header: "",
            className: "text-right",
            cell: (w) => (
              <div className="flex justify-end gap-2">
                <Link
                  href={`/admin/workshops/${w.id}`}
                  className="text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Edit
                </Link>
                <form action={deleteWorkshop}>
                  <input type="hidden" name="id" value={w.id} />
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
