import { prisma } from "@/lib/prisma";
import { ToolDirectory } from "@/components/ToolDirectory";
import { UpcomingCards } from "@/components/UpcomingCards";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [tools, upcoming] = await Promise.all([
    prisma.tool.findMany({
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
    }),
    prisma.upcoming.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        bannerUrl: true,
        description: true,
        category: true,
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Every tool. One place<span className="text-brand">.</span>
          </h1>
          <p className="text-sm text-neutral-500">
            Click a card to open the tool in a new tab.
          </p>
        </div>
        <ToolDirectory tools={tools} />
      </div>
      <UpcomingCards items={upcoming} />
    </div>
  );
}
