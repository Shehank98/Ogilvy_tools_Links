"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveToolAccess } from "@/lib/actions/tools";
import type { PersonOption } from "@/components/admin/VisibilityPicker";

type Vis = "EVERYONE" | "SELECTED";
type GridTool = { id: string; name: string; visibility: Vis };
type State = Record<string, { visibility: Vis; users: Set<string> }>;

const initial = (tools: GridTool[], grants: Record<string, string[]>): State =>
  Object.fromEntries(tools.map((t) => [t.id, { visibility: t.visibility, users: new Set(grants[t.id] ?? []) }]));

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

export function AccessGrid({
  tools,
  people,
  grants,
}: {
  tools: GridTool[];
  people: PersonOption[];
  grants: Record<string, string[]>;
}) {
  const router = useRouter();
  const [base, setBase] = useState<State>(() => initial(tools, grants));
  const [cur, setCur] = useState<State>(() => initial(tools, grants));
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "restricted" | "none">("all");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const changed = useMemo(
    () => tools.filter((t) => cur[t.id].visibility !== base[t.id].visibility || !sameSet(cur[t.id].users, base[t.id].users)),
    [tools, cur, base]
  );

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return people.filter((p) => {
      if (t && !`${p.name} ${p.email}`.toLowerCase().includes(t)) return false;
      const has = tools.some((x) => cur[x.id].visibility === "SELECTED" && cur[x.id].users.has(p.id));
      return filter === "all" || (filter === "restricted" ? has : !has);
    });
  }, [people, tools, cur, q, filter]);

  const update = (id: string, fn: (s: State[string]) => State[string]) => {
    setMsg(null);
    setCur((c) => ({ ...c, [id]: fn(c[id]) }));
  };
  const toggle = (toolId: string, userId: string) =>
    update(toolId, (s) => {
      const users = new Set(s.users);
      if (!users.delete(userId)) users.add(userId);
      return { ...s, users };
    });
  const setAll = (toolId: string, on: boolean) =>
    update(toolId, (s) => ({ ...s, users: on ? new Set([...s.users, ...rows.map((p) => p.id)]) : new Set([...s.users].filter((u) => !rows.some((p) => p.id === u))) }));

  const save = () =>
    start(async () => {
      const res = await saveToolAccess({
        changes: changed.map((t) => ({ toolId: t.id, visibility: cur[t.id].visibility, userIds: [...cur[t.id].users] })),
      });
      if (res.ok) {
        setBase(cur);
        setMsg({ ok: true, text: `Saved ${res.tools} tool${res.tools === 1 ? "" : "s"}.` });
        router.refresh();
      } else setMsg({ ok: false, text: res.error });
    });

  const chip = (v: typeof filter, label: string) => (
    <button
      key={v}
      type="button"
      onClick={() => setFilter(v)}
      className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === v ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
    >
      {label}
    </button>
  );

  if (tools.length === 0) return <p className="text-sm text-gray-500">No active tools yet.</p>;

  return (
    <div className="space-y-3 pb-20">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people…"
          aria-label="Search people"
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {chip("all", "All people")}
        {chip("restricted", "Has restricted tools")}
        {chip("none", "No restricted tools")}
        <span className="ml-auto text-xs text-gray-500">{rows.length} of {people.length} people</span>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm" style={{ maxHeight: "62vh" }}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[14rem] border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Person
              </th>
              {tools.map((t) => (
                <th key={t.id} className="sticky top-0 z-20 min-w-[8.5rem] border-b border-gray-200 bg-gray-50 px-3 py-2 text-center align-top">
                  <div className="font-semibold text-gray-900">{t.name}</div>
                  <div className="mt-1 flex justify-center gap-2 text-[11px] font-semibold">
                    <button type="button" disabled={cur[t.id].visibility === "EVERYONE"} onClick={() => setAll(t.id, true)} className="text-brand disabled:text-gray-300">All</button>
                    <button type="button" disabled={cur[t.id].visibility === "EVERYONE"} onClick={() => setAll(t.id, false)} className="text-gray-500 disabled:text-gray-300">None</button>
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 z-30 border-b border-gray-200 bg-green-50 px-4 py-2 text-left text-xs font-semibold text-green-800">
                Visible to everyone
              </th>
              {tools.map((t) => {
                const on = cur[t.id].visibility === "EVERYONE";
                return (
                  <th key={t.id} className="border-b border-gray-200 bg-green-50 px-3 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${t.name} visible to everyone`}
                      onClick={() => update(t.id, (s) => ({ ...s, visibility: on ? "SELECTED" : "EVERYONE" }))}
                      className={`relative mx-auto block h-5 w-9 rounded-full transition ${on ? "bg-green-600" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[1.1rem]" : "left-0.5"}`} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="group">
                <td className="sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-2 group-hover:bg-gray-50">
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.email}</div>
                </td>
                {tools.map((t) => {
                  const everyone = cur[t.id].visibility === "EVERYONE";
                  return (
                    <td key={t.id} className="border-b border-gray-100 px-3 py-2 text-center group-hover:bg-gray-50">
                      {everyone ? (
                        <span title="Open to everyone" className="text-gray-300">✓</span>
                      ) : (
                        <input
                          type="checkbox"
                          aria-label={`${p.name} can see ${t.name}`}
                          checked={cur[t.id].users.has(p.id)}
                          onChange={() => toggle(t.id, p.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-brand focus:ring-brand"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={tools.length + 1} className="px-4 py-10 text-center text-sm text-gray-500">
                  {people.length === 0 ? "No verified users have signed up yet." : "No one matches."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(changed.length > 0 || msg) && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(40rem,92vw)] items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl">
          <span className="flex-1">
            {changed.length > 0
              ? `${changed.length} unsaved change${changed.length === 1 ? "" : "s"} (${changed.map((t) => t.name).join(", ")})`
              : msg && <span className={msg.ok ? "text-green-300" : "text-red-300"}>{msg.text}</span>}
            {changed.length > 0 && msg && !msg.ok && <span className="ml-2 text-red-300">{msg.text}</span>}
          </span>
          {changed.length > 0 && (
            <>
              <button type="button" onClick={() => { setCur(base); setMsg(null); }} className="font-semibold text-gray-300 hover:text-white">
                Discard
              </button>
              <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-brand px-4 py-1.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {pending ? "Saving…" : "Save access"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
