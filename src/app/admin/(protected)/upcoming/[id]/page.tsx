import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UpcomingForm } from "@/components/admin/UpcomingForm";

export const dynamic = "force-dynamic";

export default async function EditUpcomingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.upcoming.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit coming-soon item</h1>
      <UpcomingForm item={item} />
    </div>
  );
}
