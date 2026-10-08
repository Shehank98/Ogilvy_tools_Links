"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { ticketSchema } from "@/lib/validation";
import {
  sendAdminNewTicketEmail,
  sendTicketReceivedEmail,
} from "@/lib/mail";
import { KIND_LABEL, PRIORITY_LABEL, ticketCode } from "@/lib/tickets";
import { firstZodError, type ActionState } from "./state";

export async function submitTicket(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = ticketSchema.safeParse({
    kind: formData.get("kind"),
    targetId: formData.get("targetId"),
    priority: formData.get("priority"),
    title: formData.get("title"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const d = parsed.data;

  let targetType: "TOOL" | "GENERAL" = "GENERAL";
  let targetName = "General";
  if (d.targetId !== "general") {
    const tool = await prisma.tool.findUnique({
      where: { id: d.targetId },
      select: { name: true },
    });
    if (!tool) return { error: "That tool no longer exists. Pick another." };
    targetType = "TOOL";
    targetName = tool.name;
  }

  const ticket = await prisma.feedback.create({
    data: {
      targetType,
      targetId: d.targetId,
      targetName,
      kind: d.kind,
      priority: d.priority,
      title: d.title,
      message: d.message,
      userId: user.id,
      email: user.email,
      events: { create: { status: "NEW", note: "Ticket raised" } },
    },
  });

  const mail = {
    code: ticketCode(ticket.ticketNo),
    title: d.title,
    kind: KIND_LABEL[d.kind],
    tool: targetName,
  };
  // Emails are best-effort: the ticket is already saved.
  sendTicketReceivedEmail(user.email, user.name, mail).catch((e) =>
    console.error("[tickets] confirmation email failed:", e)
  );
  const notify = process.env.ADMIN_NOTIFY_EMAIL;
  if (notify) {
    sendAdminNewTicketEmail(notify, user.name, PRIORITY_LABEL[d.priority], mail).catch((e) =>
      console.error("[tickets] admin email failed:", e)
    );
  }

  revalidatePath("/tickets");
  revalidatePath("/admin/feedback");
  redirect(`/tickets?new=${ticketCode(ticket.ticketNo)}`);
}
