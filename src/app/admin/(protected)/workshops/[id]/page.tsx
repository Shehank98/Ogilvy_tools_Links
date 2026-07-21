import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkshopForm } from "@/components/admin/WorkshopForm";

export const dynamic = "force-dynamic";

export default async function EditWorkshopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit workshop</h1>
      <WorkshopForm workshop={workshop} />
    </div>
  );
}
