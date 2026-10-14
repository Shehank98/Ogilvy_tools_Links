import { prisma } from "@/lib/prisma";
import { AccessGrid } from "@/components/admin/AccessGrid";

export const dynamic = "force-dynamic";

export default async function ToolAccessPage() {
  const [tools, people, access] = await Promise.all([
    prisma.tool.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, visibility: true },
    }),
    prisma.user.findMany({
      where: { verified: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.toolAccess.findMany({ select: { toolId: true, userId: true } }),
  ]);

  const grants: Record<string, string[]> = {};
  for (const a of access) (grants[a.toolId] ??= []).push(a.userId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tool access</h1>
        <p className="text-sm text-gray-500">
          Decide who sees which tool. People who are not ticked never see a restricted tool.
        </p>
      </div>
      <AccessGrid tools={tools} people={people} grants={grants} />
    </div>
  );
}
