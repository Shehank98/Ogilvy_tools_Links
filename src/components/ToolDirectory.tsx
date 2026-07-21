"use client";

import { useMemo, useState } from "react";
import { logToolClick } from "@/lib/actions/public";
import { resolveImageUrl } from "@/lib/image";

export type ToolItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  link: string;
  description: string | null;
  category: string;
};

function ToolLogo({ tool }: { tool: ToolItem }) {
  const src = resolveImageUrl(tool.logoUrl);
  const [failed, setFailed] = useState(false);
  const letter = tool.name.charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
        {letter}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-xl border border-black/5 bg-white object-contain p-1.5"
    />
  );
}

function ToolCard({ tool }: { tool: ToolItem }) {
  return (
    <a
      href={tool.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => logToolClick(tool.id)}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand/60 hover:shadow-xl sm:p-6"
    >
      <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-brand transition-transform duration-200 group-hover:scale-x-100" />
      <div className="mb-4 flex items-start gap-3">
        <ToolLogo tool={tool} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-black group-hover:text-brand-dark">
            {tool.name}
          </h3>
          <span className="mt-1 inline-flex max-w-full truncate rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            {tool.category}
          </span>
        </div>
        <span
          aria-hidden
          className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-brand"
        >
          ↗
        </span>
      </div>
      {tool.description ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">
          {tool.description}
        </p>
      ) : (
        <p className="text-sm italic text-neutral-400">Open tool →</p>
      )}
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
        <div className="relative w-full">
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
          >
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools…"
            className="w-full rounded-full border border-black/15 bg-white py-3 pl-10 pr-5 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-full border border-black/15 bg-white px-5 py-3 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:w-56"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {tools.length > 0 && (
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
          {category !== "all" && ` in ${category}`}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center">
          <p className="text-sm text-neutral-500">
            {tools.length === 0
              ? "No tools have been added yet. Check back soon."
              : "No tools match your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
