import { WorkshopForm } from "@/components/admin/WorkshopForm";

export const dynamic = "force-dynamic";

export default function NewWorkshopPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Add workshop</h1>
      <WorkshopForm />
    </div>
  );
}
