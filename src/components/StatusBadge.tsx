const styles: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  UNDER_REVIEW: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  BUILT: "bg-indigo-50 text-indigo-700",
  DRAFT: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-green-50 text-green-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
