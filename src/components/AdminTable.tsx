import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function AdminTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className={`px-4 py-3 ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-4 py-3 align-middle ${col.className ?? ""}`}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
