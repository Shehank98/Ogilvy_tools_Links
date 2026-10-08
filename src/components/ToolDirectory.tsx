"use client";

import { useState } from "react";
import { logToolClick } from "@/lib/actions/public";
import { resolveImageUrl } from "@/lib/image";
import { FEATURES } from "@/lib/features";
import { FeedbackButton } from "@/components/FeedbackButton";

export type ToolItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  link: string;
  description: string | null;
  category: string;
  isBeta: boolean;
};

function ToolLogoBand({ tool }: { tool: ToolItem }) {
  const src = resolveImageUrl(tool.logoUrl);
  const [failed, setFailed] = useState(false);
  const letter = tool.name.charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <div className="flex h-20 items-center justify-center bg-gradient-to-br from-brand to-brand-dark">
        <span className="font-serif text-3xl font-bold text-white/95 transition duration-300 group-hover:scale-110">
          {letter}
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${tool.name} logo`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-20 w-full bg-white object-cover transition duration-500 group-hover:scale-105"
    />
  );
}

// Compact tile: just the logo and the tool's name. Click opens the tool; the
// small bulb (top-right) still lets people send feedback about it.
function ToolCard({
  tool,
  signedIn,
  index,
}: {
  tool: ToolItem;
  signedIn: boolean;
  index: number;
}) {
  return (
    <div
      className="anim-fade-up stagger group relative h-full"
      style={{ "--i": index } as React.CSSProperties}
    >
      <a
        href={tool.link}
        target="_blank"
        rel="noopener noreferrer"
        title={tool.description ?? tool.name}
        onClick={() => logToolClick(tool.id)}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-lg active:translate-y-0 active:scale-[0.97]"
      >
        {FEATURES.toolLogos && (
          <div className="overflow-hidden border-b border-black/5">
            <ToolLogoBand tool={tool} />
          </div>
        )}
        <div className="flex items-center justify-center gap-1.5 px-3 py-2.5">
          <h3 className="truncate text-sm font-semibold text-black group-hover:text-brand-dark">
            {tool.name}
          </h3>
          {tool.isBeta && (
            <span
              title="Beta: still being tested, you may run into errors."
              className="shrink-0 rounded bg-amber-100 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-700"
            >
              Beta
            </span>
          )}
        </div>
      </a>
      <FeedbackButton
        targetType="TOOL"
        targetId={tool.id}
        targetName={tool.name}
        variant="tool"
        hideEmail={signedIn}
        className="absolute right-1.5 top-1.5 z-10 rounded-full border border-black/10 bg-white/90 px-2 py-0.5 text-[11px] font-medium text-neutral-600 shadow-sm backdrop-blur transition hover:border-brand hover:text-brand"
      />
    </div>
  );
}

export function ToolDirectory({
  tools,
  signedIn = false,
}: {
  tools: ToolItem[];
  signedIn?: boolean;
}) {
  if (tools.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center">
        <p className="text-sm text-neutral-500">
          No tools have been added yet. Check back soon.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {tools.map((tool, i) => (
        <ToolCard key={tool.id} tool={tool} signedIn={signedIn} index={i} />
      ))}
    </div>
  );
}
