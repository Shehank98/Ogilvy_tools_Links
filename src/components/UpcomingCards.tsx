"use client";

import { useState } from "react";
import { resolveImageUrl } from "@/lib/image";

export type UpcomingItem = {
  id: string;
  name: string;
  bannerUrl: string | null;
  description: string | null;
  category: string | null;
  voteCount: number;
};

function Banner({ item }: { item: UpcomingItem }) {
  const src = resolveImageUrl(item.bannerUrl);
  const [failed, setFailed] = useState(false);
  const letter = item.name.charAt(0).toUpperCase();

  if (!src || failed) {
    return (
      <div className="anim-gradient flex h-20 items-end justify-center bg-gradient-to-br from-neutral-700 via-neutral-900 to-neutral-700">
        <span className="pb-2 font-serif text-3xl font-bold text-white/90 transition duration-300 group-hover:scale-110">
          {letter}
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${item.name} banner`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-20 w-full bg-white object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
    />
  );
}

// Compact "coming soon" tile: banner and name only.
function UpcomingCard({ item, index }: { item: UpcomingItem; index: number }) {
  return (
    <div
      style={{ "--i": index } as React.CSSProperties}
      title={item.description ?? item.name}
      className="anim-fade-up stagger group relative flex h-full cursor-default flex-col overflow-hidden rounded-xl border border-dashed border-black/15 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-black/30 hover:shadow-lg"
    >
      <div className="shine relative overflow-hidden border-b border-black/5">
        <Banner item={item} />
        <span className="anim-float absolute right-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Coming soon
        </span>
      </div>
      <div className="px-3 py-2.5">
        <h3 className="truncate text-center text-sm font-semibold text-black">
          {item.name}
        </h3>
      </div>
    </div>
  );
}

export function UpcomingCards({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="anim-fade-up flex items-baseline gap-3">
        <h2 className="text-lg font-bold tracking-tight text-black">
          Coming soon
        </h2>
        <p className="text-sm text-neutral-500">In the works, not live yet.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item, i) => (
          <UpcomingCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
