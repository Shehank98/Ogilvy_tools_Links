import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [toolCount, workshopCount, postCount, newRequestCount, topTools] =
    await Promise.all([
      prisma.tool.count(),
      prisma.workshop.count(),
      prisma.post.count(),
      prisma.toolRequest.count({ where: { status: "NEW" } }),
      prisma.tool.findMany({
        orderBy: { clickCount: "desc" },
        take: 5,
        select: { id: true, name: true, clickCount: true },
      }),
    ]);

  const stats = [
    { label: "Tools", value: toolCount, href: "/admin/tools" },
    { label: "Workshops", value: workshopCount, href: "/admin/workshops" },
    { label: "Posts", value: postCount, href: "/admin/posts" },
    { label: "New requests", value: newRequestCount, href: "/admin/requests" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition hover:border-brand/40">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </Card>
          </Link>
        ))}
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
