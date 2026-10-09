import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FEATURES } from "@/lib/features";
import { requireUser } from "@/lib/user-auth";
import { TicketForm } from "@/components/TicketForm";
import { storageEnabled } from "@/lib/storage";

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
    <div className="mx-auto grid h-full max-w-5xl grid-rows-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="anim-fade-up min-h-0 min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <TicketForm tools={tools} defaultToolId={defaultToolId} uploadsEnabled={storageEnabled()} />
      </div>
      <aside className="anim-fade-up stagger hidden max-h-full min-w-0 self-start overflow-y-auto rounded-xl lg:block border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">What happens next</h2>
        <ol className="mt-3 space-y-3 text-sm text-gray-600">
          {[
            ["You submit", "and get a ticket number by email."],
            ["The Automation team reviews", "and sets a status."],
            ["You follow progress", "under My Tickets and by email."],
            ...(storageEnabled() ? [["Attachments are deleted", "automatically once your ticket is resolved."]] : []),
          ].map(([b, t], i) => (
            <li
              key={b}
              style={{ "--i": i + 2 } as React.CSSProperties}
              className="anim-fade-up stagger flex gap-3"
            >
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
