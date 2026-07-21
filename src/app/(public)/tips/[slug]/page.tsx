import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/tips"
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← All tips & tricks
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">{post.title}</h1>
      {post.publishedAt && (
        <p className="mt-1 text-sm text-gray-500">
          {dateFormat.format(post.publishedAt)}
        </p>
      )}
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          className="mt-6 w-full rounded-xl object-cover"
        />
      )}
      <div className="prose-custom mt-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </div>
    </article>
  );
}
