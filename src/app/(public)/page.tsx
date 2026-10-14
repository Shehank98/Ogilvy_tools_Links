import { prisma } from "@/lib/prisma";
import { ToolDirectory } from "@/components/ToolDirectory";
import { UpcomingCards } from "@/components/UpcomingCards";
import { getCurrentUser } from "@/lib/user-auth";
import { visibleToolsWhere } from "@/lib/tool-access";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const signedIn = !!user;
  const [tools, upcoming] = await Promise.all([
    prisma.tool.findMany({
      where: visibleToolsWhere(user?.id ?? null),
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        logoUrl: true,
        link: true,
        description: true,
        category: true,
        isBeta: true,
        subtitle: true,
        about: true,
        purpose: true,
        initiatedBy: true,
        developedBy: true,
        team: true,
        advisory: true,
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
        voteCount: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <ToolDirectory tools={tools} signedIn={signedIn} />
      <UpcomingCards items={upcoming} />
    </div>
  );
}
