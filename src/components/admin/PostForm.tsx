import type { Post } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field, Select, TextInput } from "@/components/fields";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { savePost } from "@/lib/actions/posts";

export function PostForm({ post }: { post?: Post }) {
  const action = savePost.bind(null, post?.id ?? null);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <ActionForm
        action={action}
        submitLabel={post ? "Save changes" : "Create post"}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Title">
              <TextInput name="title" defaultValue={post?.title} required />
            </Field>
          </div>
          <Field label="Status" hint="Only published posts appear on the site">
            <Select name="status" defaultValue={post?.status ?? "DRAFT"}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </Select>
          </Field>
        </div>
        <Field label="Cover image URL (optional)">
          <TextInput
            name="coverImageUrl"
            placeholder="https://…/cover.png"
            defaultValue={post?.coverImageUrl ?? ""}
          />
        </Field>
        <Field label="Body (markdown)">
          <MarkdownEditor name="body" defaultValue={post?.body} />
        </Field>
      </ActionForm>
    </div>
  );
}
