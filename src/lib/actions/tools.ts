"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toolAccessSchema, toolSchema } from "@/lib/validation";
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
    isBeta: formData.get("isBeta") === "on",
    subtitle: formData.get("subtitle") ?? undefined,
    about: formData.get("about") ?? undefined,
    purpose: formData.get("purpose") ?? undefined,
    initiatedBy: formData.get("initiatedBy") ?? undefined,
    developedBy: formData.get("developedBy") ?? undefined,
    team: formData.get("team") ?? undefined,
    advisory: formData.get("advisory") ?? undefined,
    visibility: formData.get("visibility") ?? "EVERYONE",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };
  const d = parsed.data;

  const data = {
    name: d.name,
    link: d.link,
    category: d.category,
    order: d.order,
    isActive: d.isActive,
    isBeta: d.isBeta,
    visibility: d.visibility,
    logoUrl: d.logoUrl || null,
    description: d.description || null,
    subtitle: d.subtitle || null,
    about: d.about || null,
    purpose: d.purpose || null,
    initiatedBy: d.initiatedBy || null,
    developedBy: d.developedBy || null,
    team: d.team || null,
    advisory: d.advisory || null,
  };
  const tool = id
    ? await prisma.tool.update({ where: { id }, data })
    : await prisma.tool.create({ data });

  // The chosen people only matter while the tool is "Only selected people".
  // When it is switched back to Everyone the list is kept, so flipping the
  // setting again does not lose the selection.
  if (d.visibility === "SELECTED") {
    await replaceToolAccess(tool.id, formData.getAll("accessUserIds").map(String));
  }
  revalidatePath("/");
  revalidatePath("/admin/tools");
  revalidatePath("/admin/access");
  redirect("/admin/tools");
}

/** Makes the allowed-people list for a tool exactly `userIds` (verified accounts only). */
async function replaceToolAccess(toolId: string, userIds: string[]): Promise<number> {
  const valid = await prisma.user.findMany({
    where: { id: { in: [...new Set(userIds)] }, verified: true },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.toolAccess.deleteMany({ where: { toolId } }),
    prisma.toolAccess.createMany({
      data: valid.map((u) => ({ toolId, userId: u.id })),
      skipDuplicates: true,
    }),
  ]);
  return valid.length;
}

/** Saves the "Tool access" grid: for each changed tool, its visibility and people. */
export async function saveToolAccess(
  input: unknown
): Promise<{ ok: true; tools: number } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = toolAccessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const existing = new Set(
    (
      await prisma.tool.findMany({
        where: { id: { in: parsed.data.changes.map((c) => c.toolId) } },
        select: { id: true },
      })
    ).map((t) => t.id)
  );
  let saved = 0;
  for (const c of parsed.data.changes) {
    if (!existing.has(c.toolId)) continue;
    await prisma.tool.update({ where: { id: c.toolId }, data: { visibility: c.visibility } });
    await replaceToolAccess(c.toolId, c.userIds);
    saved++;
  }
  revalidatePath("/");
  revalidatePath("/admin/tools");
  revalidatePath("/admin/access");
  return { ok: true, tools: saved };
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
