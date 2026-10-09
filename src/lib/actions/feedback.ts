"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getCurrentUser } from "@/lib/user-auth";
import { FEATURES } from "@/lib/features";
import { sendAssignmentEmail, sendTicketUpdateEmail } from "@/lib/mail";
import { KIND_LABEL, PRIORITY_LABEL, STATUS_LABEL, ticketCode } from "@/lib/tickets";
import { cleanAssignees, emailFor, formatAssignees } from "@/lib/team";
import { isFinalStatus, purgeTicketFiles } from "@/lib/ticket-files";
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
  const notifyAssignees = formData.get("notifyAssignees") === "on";
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const d = parsed.data;

  const current = await prisma.feedback.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { files: { where: { deletedAt: null } } } },
    },
  });
  if (!current) return { error: "That ticket no longer exists." };

  const note = d.publicNote || null;
  const statusChanged = current.status !== d.status;
  const noteChanged = !!note && note !== current.publicNote;

  // Assignment: only known team members are accepted.
  const assignees = cleanAssignees(formData.getAll("assignedTo"));
  const sameTeam =
    assignees.length === current.assignedTo.length &&
    assignees.every((n) => current.assignedTo.includes(n));
  const assignmentChanged = !sameTeam;

  await prisma.feedback.update({
    where: { id },
    data: {
      status: d.status,
      adminNotes: d.adminNotes || null,
      publicNote: note,
      assignedTo: assignees,
      // The timeline records each visible change.
      ...(statusChanged || noteChanged || assignmentChanged
        ? {
            events: {
              create: [
                ...(statusChanged || noteChanged
                  ? [{ status: d.status, note: noteChanged ? note : null }]
                  : []),
                ...(assignmentChanged
                  ? [
                      {
                        status: d.status,
                        note: assignees.length
                          ? `Assigned to ${formatAssignees(assignees)}`
                          : "Unassigned",
                      },
                    ]
                  : []),
              ],
            },
          }
        : {}),
    },
  });

  // Resolved or closed: the attachments are no longer needed, so free the storage.
  let filesRemoved = 0;
  if (isFinalStatus(d.status)) {
    const purge = await purgeTicketFiles(id);
    filesRemoved = purge.removed;
    if (purge.removed > 0) {
      await prisma.feedbackEvent.create({
        data: {
          feedbackId: id,
          status: d.status,
          note: `${purge.removed} attachment${purge.removed === 1 ? "" : "s"} deleted from storage (ticket ${STATUS_LABEL[d.status].toLowerCase()})`,
        },
      });
    }
  }

  // Tell anyone who has just been assigned.
  const newlyAssigned = assignees.filter((n) => !current.assignedTo.includes(n));
  let assigneesEmailed = 0;
  if (notifyAssignees && newlyAssigned.length) {
    const requester = current.user?.name ?? "";
    const results = await Promise.all(
      newlyAssigned.map(async (name) => {
        const to = emailFor(name);
        if (!to) return false;
        try {
          await sendAssignmentEmail(to, name, {
            id: current.id,
            code: ticketCode(current.ticketNo),
            title: current.title ?? current.message.slice(0, 80),
            kind: KIND_LABEL[current.kind],
            tool: current.targetName,
            priority: PRIORITY_LABEL[current.priority],
            requester,
            requesterEmail: current.user?.email ?? current.email ?? "",
            description: current.message,
            attachments: filesRemoved > 0 ? 0 : current._count.files,
            coAssignees: assignees.filter((n) => n !== name),
          });
          return true;
        } catch (e) {
          console.error(`[feedback] assignment email to ${name} failed:`, e);
          return false;
        }
      })
    );
    assigneesEmailed = results.filter(Boolean).length;
  }

  let emailed = false;
  const to = current.user?.email ?? current.email;
  const changedForRequester = statusChanged || noteChanged || assignmentChanged;
  if (d.notify && to && changedForRequester) {
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
        note,
        assignees
      );
      emailed = true;
    } catch (e) {
      console.error("[feedback] update email failed:", e);
    }
  }
  revalidatePath("/admin/feedback");
  revalidatePath("/tickets");
  const bits: string[] = [];
  if (d.notify && changedForRequester) bits.push(emailed ? "requester emailed" : "requester email could not be sent");
  if (notifyAssignees && newlyAssigned.length) {
    bits.push(
      assigneesEmailed === newlyAssigned.length
        ? `${assigneesEmailed} assignee${assigneesEmailed === 1 ? "" : "s"} emailed`
        : `assignee email failed for ${newlyAssigned.length - assigneesEmailed} of ${newlyAssigned.length}`
    );
  }
  if (filesRemoved) bits.push(`${filesRemoved} attachment${filesRemoved === 1 ? "" : "s"} deleted from storage`);
  return {
    success: `Feedback updated${bits.length ? ": " + bits.join(", ") : ""}.`,
  };
}

export async function deleteFeedback(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await purgeTicketFiles(id); // never leave orphaned files behind
  await prisma.feedback.delete({ where: { id } });
  revalidatePath("/admin/feedback");
  redirect("/admin/feedback");
}
