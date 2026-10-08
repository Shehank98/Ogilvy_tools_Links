const styles: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  UNDER_REVIEW: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  BUILT: "bg-brand-light text-brand-dark",
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-green-50 text-green-700",
  REVIEWING: "bg-yellow-50 text-yellow-700",
  PLANNED: "bg-brand-light text-brand-dark",
  DONE: "bg-green-50 text-green-700",
  DISMISSED: "bg-gray-100 text-gray-500",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

const prioStyles: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 ring-1 ring-red-200",
  HIGH: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  MEDIUM: "bg-gray-100 text-gray-600",
  LOW: "bg-gray-50 text-gray-500",
};

export function PriorityBadge({ priority, label }: { priority: string; label?: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        prioStyles[priority] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {label ?? priority}
    </span>
  );
}
