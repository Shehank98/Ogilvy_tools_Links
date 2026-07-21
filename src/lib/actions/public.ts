"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function logToolClick(id: string): Promise<void> {
  try {
    await prisma.tool.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
    });
  } catch {
    // Click logging is best-effort; never block opening the tool.
  }
}

export async function markInterested(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await prisma.workshop.update({
      where: { id },
      data: { interestedCount: { increment: 1 } },
    });
    revalidatePath("/workshops");
  } catch {
    // Ignore counts for workshops that no longer exist.
  }
}
