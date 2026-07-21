import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NoticeForm } from "@/components/admin/NoticeForm";

export const dynamic = "force-dynamic";

export default async function EditNoticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit notice</h1>
      <NoticeForm notice={notice} />
    </div>
  );
}
