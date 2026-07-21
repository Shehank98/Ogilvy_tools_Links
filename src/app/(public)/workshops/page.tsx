import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/Card";
import { markInterested } from "@/lib/actions/public";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type WorkshopRow = {
  id: string;
  title: string;
  description: string | null;
  dateTime: Date;
  location: string | null;
  interestedCount: number;
};

function WorkshopCard({
  workshop,
  past,
}: {
  workshop: WorkshopRow;
  past?: boolean;
}) {
  return (
    <Card className={past ? "opacity-70" : ""}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{workshop.title}</h3>
          <p className="mt-0.5 text-sm font-medium text-indigo-700">
            {dateFormat.format(workshop.dateTime)}
          </p>
          {workshop.location && (
            <p className="mt-0.5 text-sm text-gray-500">{workshop.location}</p>
          )}
          {workshop.description && (
            <p className="mt-2 text-sm text-gray-600">{workshop.description}</p>
          )}
        </div>
        {!past && (
          <form action={markInterested} className="shrink-0">
            <input type="hidden" name="id" value={workshop.id} />
            <button
              type="submit"
              className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              ★ Interested ({workshop.interestedCount})
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}

export default async function WorkshopsPage() {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.workshop.findMany({
      where: { dateTime: { gte: now } },
      orderBy: { dateTime: "asc" },
    }),
    prisma.workshop.findMany({
      where: { dateTime: { lt: now } },
      orderBy: { dateTime: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workshops</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upcoming sessions and events. Hit “Interested” so we know how many
          seats to plan for.
        </p>
      </div>

      <section className="space-y-4">
        {upcoming.length === 0 ? (
          <EmptyState message="No upcoming workshops scheduled right now — check back soon." />
        ) : (
          upcoming.map((w) => <WorkshopCard key={w.id} workshop={w} />)
        )}
      </section>

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
            Past workshops ({past.length})
          </summary>
          <div className="mt-4 space-y-4">
            {past.map((w) => (
              <WorkshopCard key={w.id} workshop={w} past />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
