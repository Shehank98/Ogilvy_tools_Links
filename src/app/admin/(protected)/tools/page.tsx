import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTable } from "@/components/AdminTable";
import { deleteTool, toggleToolActive } from "@/lib/actions/tools";
import { resolveImageUrl } from "@/lib/image";

export const dynamic = "force-dynamic";

export default async function AdminToolsPage() {
  const tools = await prisma.tool.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
        <Link
          href="/admin/tools/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Add tool
        </Link>
      </div>

      <AdminTable
        rows={tools}
        emptyMessage="No tools yet. Add your first one."
        columns={[
          {
            header: "Tool",
            cell: (tool) => (
              <div className="flex items-center gap-2">
                {tool.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(tool.logoUrl) ?? ""}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded object-contain"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-light text-xs font-bold text-brand-dark">
                    {tool.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="font-medium text-gray-900">{tool.name}</span>
                {tool.isBeta && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Beta
                  </span>
                )}
              </div>
            ),
          },
          { header: "Category", cell: (tool) => tool.category },
          { header: "Order", cell: (tool) => tool.order },
          { header: "Clicks", cell: (tool) => tool.clickCount },
          {
            header: "Status",
            cell: (tool) => (
              <form action={toggleToolActive}>
                <input type="hidden" name="id" value={tool.id} />
                <button
                  type="submit"
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tool.isActive
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                  title="Click to toggle"
                >
                  {tool.isActive ? "Active" : "Inactive"}
                </button>
              </form>
            ),
          },
          {
            header: "",
            className: "text-right",
            cell: (tool) => (
              <div className="flex justify-end gap-2">
                <Link
                  href={`/admin/tools/${tool.id}`}
                  className="text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Edit
                </Link>
                <form action={deleteTool}>
                  <input type="hidden" name="id" value={tool.id} />
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
