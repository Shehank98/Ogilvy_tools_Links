import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminTable } from "@/components/AdminTable";
import { StatusBadge } from "@/components/StatusBadge";
import { deletePost } from "@/lib/actions/posts";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminPostsPage() {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tips & Tricks</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + New post
        </Link>
      </div>

      <AdminTable
        rows={posts}
        emptyMessage="No posts yet — write your first tip or newsletter."
        columns={[
          {
            header: "Title",
            cell: (post) => (
              <span className="font-medium text-gray-900">{post.title}</span>
            ),
          },
          {
            header: "Status",
            cell: (post) => <StatusBadge status={post.status} />,
          },
          {
            header: "Published",
            cell: (post) =>
              post.publishedAt ? dateFormat.format(post.publishedAt) : "—",
          },
          {
            header: "Created",
            cell: (post) => dateFormat.format(post.createdAt),
          },
          {
            header: "",
            className: "text-right",
            cell: (post) => (
              <div className="flex justify-end gap-2">
                {post.status === "PUBLISHED" && (
                  <Link
                    href={`/tips/${post.slug}`}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    View
                  </Link>
                )}
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Edit
                </Link>
                <form action={deletePost}>
                  <input type="hidden" name="id" value={post.id} />
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
