"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { noticeSchema } from "@/lib/validation";
import { firstZodError, type ActionState } from "./state";

export async function saveNotice(
  id: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = noticeSchema.safeParse({
    message: formData.get("message"),
    type: formData.get("type"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  if (id) {
    await prisma.notice.update({ where: { id }, data: parsed.data });
  } else {
    await prisma.notice.create({ data: parsed.data });
  }
  revalidatePath("/");
  revalidatePath("/admin/notices");
  redirect("/admin/notices");
}

export async function deleteNotice(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.notice.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/notices");
}

export async function toggleNoticeActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) return;
  await prisma.notice.update({
    where: { id },
    data: { isActive: !notice.isActive },
  });
  revalidatePath("/");
  revalidatePath("/admin/notices");
}
