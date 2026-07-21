import { prisma } from "@/lib/prisma";
import { ToolDirectory } from "@/components/ToolDirectory";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tools = await prisma.tool.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      logoUrl: true,
      link: true,
      description: true,
      category: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tool Directory</h1>
        <p className="mt-1 text-sm text-gray-600">
          All the tools we use, in one place. Click a card to open the tool in a
          new tab.
        </p>
      </div>
      <ToolDirectory tools={tools} />
    </div>
  );
}
