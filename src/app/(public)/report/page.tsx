import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";
import { requireUser } from "@/lib/user-auth";
import { TicketForm } from "@/components/TicketForm";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string }>;
}) {
  if (!FEATURES.userLogin) redirect("/");
  await requireUser();
  const { tool } = await searchParams;
  const tools = await prisma.tool.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  const defaultToolId = tools.some((t) => t.id === tool) ? tool! : "general";

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Report a bug or suggestion</h1>
        <p className="mb-5 mt-1 text-sm text-gray-600">
          Found something broken or have an idea? Tell the Automation team.
        </p>
        <TicketForm tools={tools} defaultToolId={defaultToolId} />
      </div>
      <aside className="h-fit rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">What happens next</h2>
        <ol className="mt-3 space-y-3 text-sm text-gray-600">
          {[
            ["You submit", "and get a ticket number by email."],
            ["The Automation team reviews", "and sets a status."],
            ["You follow progress", "under My Tickets and by email."],
          ].map(([b, t], i) => (
            <li key={b} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                {i + 1}
              </span>
              <span>
                <strong className="text-gray-900">{b}</strong> {t}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
