import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";
import { EmptyState } from "@/components/Card";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function TipsPage() {
  if (!FEATURES.tips) redirect("/");
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      body: true,
      coverImageUrl: true,
      publishedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tips & Tricks</h1>
        <p className="mt-1 text-sm text-gray-600">
          Newsletters, how-tos and small wins from around the team.
        </p>
      </div>

      {posts.length === 0 ? (
        <EmptyState message="No posts published yet. Check back soon." />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/tips/${post.slug}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand/40 hover:shadow-md"
            >
              <div className="flex gap-4">
                {post.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImageUrl}
                    alt=""
                    className="hidden h-24 w-32 rounded-lg object-cover sm:block"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">{post.title}</h2>
                  {post.publishedAt && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {dateFormat.format(post.publishedAt)}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {post.body.replace(/[#*_>`\[\]]/g, "").slice(0, 200)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
