import { UpcomingForm } from "@/components/admin/UpcomingForm";

export const dynamic = "force-dynamic";

export default function NewUpcomingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Add coming-soon item</h1>
      <UpcomingForm />
    </div>
  );
}
