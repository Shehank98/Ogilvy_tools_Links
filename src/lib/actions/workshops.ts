"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { workshopSchema } from "@/lib/validation";
import { firstZodError, type ActionState } from "./state";

export async function saveWorkshop(
  id: string | null,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = workshopSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dateTime: formData.get("dateTime"),
    location: formData.get("location"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const data = {
    ...parsed.data,
    description: parsed.data.description || null,
    location: parsed.data.location || null,
  };
  if (id) {
    await prisma.workshop.update({ where: { id }, data });
  } else {
    await prisma.workshop.create({ data });
  }
  revalidatePath("/workshops");
  revalidatePath("/admin/workshops");
  redirect("/admin/workshops");
}

export async function deleteWorkshop(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.workshop.delete({ where: { id } });
  revalidatePath("/workshops");
  revalidatePath("/admin/workshops");
}
