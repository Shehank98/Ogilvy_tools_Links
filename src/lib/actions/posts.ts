"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { postSchema, slugify } from "@/lib/validation";
import { firstZodError, type ActionState } from "./state";

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || "post";
  let slug = base;
  let n = 2;
  while (
    await prisma.post.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
  ) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function savePost(
  id: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    coverImageUrl: formData.get("coverImageUrl"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const existing = id
    ? await prisma.post.findUnique({ where: { id } })
    : null;
  const data = {
    ...parsed.data,
    coverImageUrl: parsed.data.coverImageUrl || null,
    slug: await uniqueSlug(parsed.data.title, id ?? undefined),
    publishedAt:
      parsed.data.status === "PUBLISHED"
        ? existing?.publishedAt ?? new Date()
        : null,
  };
  if (id) {
    await prisma.post.update({ where: { id }, data });
  } else {
    await prisma.post.create({ data });
  }
  revalidatePath("/tips");
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.post.delete({ where: { id } });
  revalidatePath("/tips");
  revalidatePath("/admin/posts");
}
