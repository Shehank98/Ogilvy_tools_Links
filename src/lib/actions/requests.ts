"use server";

import { prisma } from "@/lib/prisma";
import { toolRequestSchema } from "@/lib/validation";
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
  return {
    success:
      "Request submitted! You can check its status any time on the status page using your email.",
  };
}
