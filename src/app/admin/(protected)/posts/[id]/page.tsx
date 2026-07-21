import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/admin/PostForm";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit post</h1>
      <PostForm post={post} />
    </div>
  );
}
