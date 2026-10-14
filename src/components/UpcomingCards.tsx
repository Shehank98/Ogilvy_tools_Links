"use client";

import { LogoTile } from "@/components/ToolDirectory";

export type UpcomingItem = {
  id: string;
  name: string;
  bannerUrl: string | null;
  description: string | null;
  category: string | null;
  voteCount: number;
};

// "Coming soon" tile: same size as a live tool, muted, not clickable.
function UpcomingCard({ item, index }: { item: UpcomingItem; index: number }) {
  return (
    <div
      style={{ "--i": index } as React.CSSProperties}
      title={item.description ?? item.name}
      className="anim-fade-up stagger group relative flex h-full cursor-default flex-col items-center gap-4 rounded-[1.4rem] border border-dashed border-black/20 bg-white/70 px-4 pb-5 pt-8 text-center transition duration-300 hover:-translate-y-0.5 hover:border-black/35"
    >
      <span className="anim-float absolute right-3 top-3 rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        Coming soon
      </span>
      <span className="shine block rounded-[1.75rem]">
        <LogoTile
          name={item.name}
          logoUrl={item.bannerUrl}
          muted
          className="h-24 w-24 rounded-[1.6rem] opacity-90 sm:h-28 sm:w-28 sm:rounded-[1.75rem]"
        />
      </span>
      <h3 className="text-lg font-bold leading-tight tracking-tight text-neutral-700 sm:text-[19px]">{item.name}</h3>
    </div>
  );
}

export function UpcomingCards({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="anim-fade-up flex items-baseline gap-3">
        <h2 className="font-serif text-xl font-bold tracking-tight text-black">Coming soon</h2>
        <p className="text-sm text-neutral-500">In the works, not live yet.</p>
      </div>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {items.map((item, i) => (
          <UpcomingCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
