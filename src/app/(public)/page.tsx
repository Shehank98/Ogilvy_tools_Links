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
    <div className="space-y-10">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
          Tool Directory
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-black sm:text-5xl">
          Every tool.
          <br />
          One place<span className="text-brand">.</span>
        </h1>
        <p className="mt-4 text-base text-neutral-600">
          All the tools we use, in one place. Click a card to open the tool in
          a new tab.
        </p>
      </div>
      <ToolDirectory tools={tools} />
    </div>
  );
}
