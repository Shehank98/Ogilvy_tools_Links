"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Assign to" button: opens a checklist of team members. Several people can be
 * picked (e.g. two people working a ticket together). The choice is submitted
 * with the surrounding form as repeated `assignedTo` fields.
 */
export function AssignPicker({
  options,
  defaultSelected,
}: {
  options: readonly string[];
  defaultSelected: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  return (
    <div ref={box} className="relative">
      {selected.map((n) => (
        <input key={n} type="hidden" name="assignedTo" value={n} />
      ))}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 shadow-sm hover:border-gray-900"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>👤</span> Assign to
        </span>
        <span aria-hidden className={`text-xs text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {selected.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((n) => (
            <li key={n} className="anim-pop inline-flex items-center gap-1 rounded-full bg-gray-900 py-0.5 pl-2.5 pr-1 text-xs font-medium text-white">
              {n}
              <button
                type="button"
                aria-label={`Unassign ${n}`}
                onClick={() => toggle(n)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-white/70 hover:bg-white/20 hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-gray-400">Not assigned to anyone yet.</p>
      )}

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="anim-pop absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl"
        >
          {options.map((name) => {
            const on = selected.includes(name);
            return (
              <label
                key={name}
                role="option"
                aria-selected={on}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${on ? "bg-red-50 text-gray-900" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(name)}
                  className="h-4 w-4 accent-[#ee3124]"
                />
                {name}
              </label>
            );
          })}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="mt-1 w-full rounded-md border-t border-gray-100 px-2.5 py-2 text-left text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              Clear assignment
            </button>
          )}
        </div>
      )}
    </div>
  );
}
