"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requestUpdateSchema, toolRequestSchema } from "@/lib/validation";
import { firstZodError, type ActionState } from "./state";

export async function submitToolRequest(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = toolRequestSchema.safeParse({
    requesterName: formData.get("requesterName"),
    requesterEmail: formData.get("requesterEmail"),
    toolName: formData.get("toolName"),
    taskDescription: formData.get("taskDescription"),
    frequency: formData.get("frequency"),
    estimatedTimeSaved: formData.get("estimatedTimeSaved"),
    attachmentUrl: formData.get("attachmentUrl"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.toolRequest.create({
    data: {
      ...parsed.data,
      estimatedTimeSaved: parsed.data.estimatedTimeSaved || null,
      attachmentUrl: parsed.data.attachmentUrl || null,
    },
  });
  revalidatePath("/admin/requests");
  return {
    success:
      "Request submitted! You can check its status any time on the status page using your email.",
  };
}

export async function updateToolRequest(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const parsed = requestUpdateSchema.safeParse({
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.toolRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes || null,
    },
  });
  revalidatePath("/admin/requests");
  return { success: "Request updated." };
}
