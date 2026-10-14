"use client";

import { useMemo, useState } from "react";

export type PersonOption = { id: string; name: string; email: string };

/**
 * "Who can see this tool": Everyone, or a hand-picked list of verified users.
 * Submits `visibility` plus repeated `accessUserIds` with the surrounding form.
 * The picked list is kept in state when flipping back to Everyone.
 */
export function VisibilityPicker({
  people,
  defaultVisibility,
  defaultSelected,
}: {
  people: PersonOption[];
  defaultVisibility: "EVERYONE" | "SELECTED";
  defaultSelected: string[];
}) {
  const [mode, setMode] = useState(defaultVisibility);
  const [selected, setSelected] = useState(() => new Set(defaultSelected));
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? people.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(t)) : people;
  }, [people, q]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const radio = (value: "EVERYONE" | "SELECTED", title: string, sub: string) => (
    <label
      className={`flex flex-1 cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm ${
        mode === value ? "border-brand bg-red-50/60" : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <input
        type="radio"
        name="visibility"
        value={value}
        checked={mode === value}
        onChange={() => setMode(value)}
        className="mt-0.5 h-4 w-4 accent-brand focus:ring-brand"
      />
      <span>
        <span className="block font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{sub}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {radio("EVERYONE", "Everyone", "All signed-in staff see this tool")}
        {radio("SELECTED", "Only selected people", "Nobody else sees it at all")}
      </div>

      {mode === "SELECTED" && (
        <div className="rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-2.5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              aria-label="Search people"
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="button"
              onClick={() => setSelected(new Set([...selected, ...shown.map((p) => p.id)]))}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Select all{q ? " shown" : ""}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-semibold text-gray-500 hover:underline"
            >
              Clear
            </button>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
              {selected.size} of {people.length} people
            </span>
          </div>
          <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
            {shown.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 rounded border-gray-300 accent-brand focus:ring-brand"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">{p.name}</span>
                    <span className="block truncate text-xs text-gray-500">{p.email}</span>
                  </span>
                </label>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-gray-500">
                {people.length === 0 ? "No verified users have signed up yet." : "No one matches that search."}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Always submitted, even while hidden, so the list survives a flip back to Everyone. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="accessUserIds" value={id} />
      ))}
    </div>
  );
}
