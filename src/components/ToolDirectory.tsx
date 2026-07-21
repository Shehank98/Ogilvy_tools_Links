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
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-3">
        {tool.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tool.logoUrl}
            alt=""
            className="h-10 w-10 rounded-lg object-contain"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-lg font-bold text-indigo-700">
            {tool.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-gray-900 group-hover:text-indigo-700">
          {tool.name}
        </span>
      </div>
      {tool.description && (
        <p className="mb-3 line-clamp-3 text-sm text-gray-600">
          {tool.description}
        </p>
      )}
      <span className="mt-auto inline-flex w-fit rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
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
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-56"
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
