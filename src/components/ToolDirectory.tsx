"use client";

import { useMemo, useState } from "react";
import { logToolClick } from "@/lib/actions/public";

export type ToolItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  link: string;
  description: string | null;
  category: string;
};

function ToolCard({ tool }: { tool: ToolItem }) {
  return (
    <a
      href={tool.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => logToolClick(tool.id)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand hover:shadow-lg"
    >
      <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-brand transition-transform duration-200 group-hover:scale-x-100" />
      <div className="mb-4 flex items-center gap-3">
        {tool.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tool.logoUrl}
            alt=""
            className="h-11 w-11 rounded-xl border border-black/5 bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            {tool.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-base font-semibold text-black group-hover:text-brand-dark">
          {tool.name}
        </span>
        <span className="ml-auto text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-brand">
          ↗
        </span>
      </div>
      {tool.description && (
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-neutral-600">
          {tool.description}
        </p>
      )}
      <span className="mt-auto inline-flex w-fit rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-600">
        {tool.category}
      </span>
    </a>
  );
}

export function ToolDirectory({ tools }: { tools: ToolItem[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => Array.from(new Set(tools.map((t) => t.category))).sort(),
    [tools]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter((tool) => {
      if (category !== "all" && tool.category !== category) return false;
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        (tool.description ?? "").toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q)
      );
    });
  }, [tools, search, category]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools…"
          className="w-full rounded-full border border-black/15 bg-white px-5 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 sm:w-56"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          {tools.length === 0
            ? "No tools have been added yet. Check back soon!"
            : "No tools match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
