"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { feedbackSchema, feedbackUpdateSchema } from "@/lib/validation";
import { firstZodError, type ActionState } from "./state";

export async function submitFeedback(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = feedbackSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    targetName: formData.get("targetName"),
    kind: formData.get("kind"),
    message: formData.get("message"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.feedback.create({
    data: { ...parsed.data, email: parsed.data.email || null },
  });
  revalidatePath("/admin/feedback");
  return { success: "Thanks! Your feedback has been sent to the team." };
}

export async function voteUpcoming(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  try {
    await prisma.upcoming.update({
      where: { id },
      data: { voteCount: { increment: 1 } },
    });
    revalidatePath("/");
  } catch {
    // Ignore votes for items that no longer exist.
  }
}

export async function updateFeedback(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = feedbackUpdateSchema.safeParse({
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.feedback.update({
    where: { id },
    data: {
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes || null,
    },
  });
  revalidatePath("/admin/feedback");
  return { success: "Feedback updated." };
}

export async function deleteFeedback(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.feedback.delete({ where: { id } });
  revalidatePath("/admin/feedback");
}
