import { prisma } from "@/lib/prisma";
import { ToolForm } from "@/components/admin/ToolForm";

export const dynamic = "force-dynamic";

export default async function NewToolPage() {
  const categories = (
    await prisma.tool.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    })
  ).map((t) => t.category);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Add tool</h1>
      <ToolForm categories={categories} />
    </div>
  );
}
