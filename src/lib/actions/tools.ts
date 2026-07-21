"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toolSchema } from "@/lib/validation";
import { firstZodError, type ActionState } from "./state";

export async function saveTool(
  id: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = toolSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    link: formData.get("link"),
    description: formData.get("description"),
    category: formData.get("category"),
    order: formData.get("order") || 0,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const data = {
    ...parsed.data,
    logoUrl: parsed.data.logoUrl || null,
    description: parsed.data.description || null,
  };
  if (id) {
    await prisma.tool.update({ where: { id }, data });
  } else {
    await prisma.tool.create({ data });
  }
  revalidatePath("/");
  revalidatePath("/admin/tools");
  redirect("/admin/tools");
}

export async function deleteTool(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.tool.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/tools");
}

export async function toggleToolActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const tool = await prisma.tool.findUnique({ where: { id } });
  if (!tool) return;
  await prisma.tool.update({
    where: { id },
    data: { isActive: !tool.isActive },
  });
  revalidatePath("/");
  revalidatePath("/admin/tools");
}
