import { PostForm } from "@/components/admin/PostForm";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New post</h1>
      <PostForm />
    </div>
  );
}
