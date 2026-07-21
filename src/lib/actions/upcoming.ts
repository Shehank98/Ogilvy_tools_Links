"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { upcomingSchema } from "@/lib/validation";
import { firstZodError, type ActionState } from "./state";

export async function saveUpcoming(
  id: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = upcomingSchema.safeParse({
    name: formData.get("name"),
    bannerUrl: formData.get("bannerUrl"),
    description: formData.get("description"),
    category: formData.get("category"),
    order: formData.get("order") || 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const data = {
    ...parsed.data,
    bannerUrl: parsed.data.bannerUrl || null,
    description: parsed.data.description || null,
    category: parsed.data.category || null,
  };
  if (id) {
    await prisma.upcoming.update({ where: { id }, data });
  } else {
    await prisma.upcoming.create({ data });
  }
  revalidatePath("/");
  revalidatePath("/admin/upcoming");
  redirect("/admin/upcoming");
}

export async function deleteUpcoming(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.upcoming.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/upcoming");
}
