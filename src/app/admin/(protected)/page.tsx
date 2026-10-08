import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [toolCount, newTicketCount, openBugCount, userCount, topTools] =
    await Promise.all([
      prisma.tool.count(),
      prisma.feedback.count({ where: { status: "NEW" } }),
      prisma.feedback.count({
        where: { kind: "BUG", status: { notIn: ["DONE", "DISMISSED"] } },
      }),
      prisma.user.count({ where: { verified: true } }),
      prisma.tool.findMany({
        orderBy: { clickCount: "desc" },
        take: 5,
        select: { id: true, name: true, clickCount: true },
      }),
    ]);

  const stats: { label: string; value: number; href: string | null }[] = [
    { label: "Tools", value: toolCount, href: "/admin/tools" },
    { label: "New tickets", value: newTicketCount, href: "/admin/feedback" },
    { label: "Open bugs", value: openBugCount, href: "/admin/feedback?kind=BUG" },
    { label: "Signed-up users", value: userCount, href: null },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const card = (
            <Card className={stat.href ? "transition hover:border-brand/40" : ""}>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Most-clicked tools
        </h2>
        {topTools.length === 0 ? (
          <p className="text-sm text-gray-500">No tools yet.</p>
        ) : (
          <Card>
            <ol className="divide-y divide-gray-100">
              {topTools.map((tool, i) => (
                <li
                  key={tool.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-gray-700">
                    <span className="mr-2 text-gray-400">{i + 1}.</span>
                    {tool.name}
                  </span>
                  <span className="font-medium text-gray-900">
                    {tool.clickCount} clicks
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </section>
    </div>
  );
}
