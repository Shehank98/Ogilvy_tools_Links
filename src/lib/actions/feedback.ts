"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getCurrentUser } from "@/lib/user-auth";
import { FEATURES } from "@/lib/features";
import { sendTicketUpdateEmail } from "@/lib/mail";
import { KIND_LABEL, STATUS_LABEL, ticketCode } from "@/lib/tickets";
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
    email: formData.get("email") ?? undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  // Signed-in staff get a trackable ticket; the account supplies their email.
  const user = await getCurrentUser();
  if (FEATURES.userLogin && !user) return { error: "Please sign in again." };

  await prisma.feedback.create({
    data: {
      ...parsed.data,
      email: user?.email ?? (parsed.data.email || null),
      userId: user?.id ?? null,
      events: { create: { status: "NEW", note: "Ticket raised" } },
    },
  });
  revalidatePath("/admin/feedback");
  revalidatePath("/tickets");
  return {
    success: user
      ? "Thanks! Your feedback has been sent. Track it under My Tickets."
      : "Thanks! Your feedback has been sent to the team.",
  };
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
    publicNote: formData.get("publicNote"),
    notify: formData.get("notify") === "on",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const d = parsed.data;

  const current = await prisma.feedback.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!current) return { error: "That ticket no longer exists." };

  const note = d.publicNote || null;
  const statusChanged = current.status !== d.status;
  const noteChanged = !!note && note !== current.publicNote;

  await prisma.feedback.update({
    where: { id },
    data: {
      status: d.status,
      adminNotes: d.adminNotes || null,
      publicNote: note,
      // The requester's timeline only records changes they can see.
      ...(statusChanged || noteChanged
        ? { events: { create: { status: d.status, note: noteChanged ? note : null } } }
        : {}),
    },
  });

  let emailed = false;
  const to = current.user?.email ?? current.email;
  if (d.notify && to && (statusChanged || noteChanged)) {
    try {
      await sendTicketUpdateEmail(
        to,
        current.user?.name ?? "",
        {
          code: ticketCode(current.ticketNo),
          title: current.title ?? current.message.slice(0, 80),
          kind: KIND_LABEL[current.kind],
          tool: current.targetName,
        },
        STATUS_LABEL[d.status],
        note
      );
      emailed = true;
    } catch (e) {
      console.error("[feedback] update email failed:", e);
    }
  }
  revalidatePath("/admin/feedback");
  revalidatePath("/tickets");
  return {
    success: `Feedback updated.${
      d.notify && (statusChanged || noteChanged)
        ? emailed
          ? " Requester emailed."
          : " (Email could not be sent.)"
        : ""
    }`,
  };
}

export async function deleteFeedback(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.feedback.delete({ where: { id } });
  revalidatePath("/admin/feedback");
  redirect("/admin/feedback");
}
