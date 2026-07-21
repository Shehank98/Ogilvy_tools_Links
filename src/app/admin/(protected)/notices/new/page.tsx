import { NoticeForm } from "@/components/admin/NoticeForm";

export const dynamic = "force-dynamic";

export default function NewNoticePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New notice</h1>
      <NoticeForm />
    </div>
  );
}
