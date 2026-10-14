import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ToolForm } from "@/components/admin/ToolForm";

export const dynamic = "force-dynamic";

export default async function EditToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tool, categories, people, access] = await Promise.all([
    prisma.tool.findUnique({ where: { id } }),
    prisma.tool.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
    prisma.user.findMany({
      where: { verified: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.toolAccess.findMany({ where: { toolId: id }, select: { userId: true } }),
  ]);
  if (!tool) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit tool</h1>
      <ToolForm
        tool={tool}
        categories={categories.map((c) => c.category)}
        people={people}
        selectedUserIds={access.map((a) => a.userId)}
      />
    </div>
  );
}
