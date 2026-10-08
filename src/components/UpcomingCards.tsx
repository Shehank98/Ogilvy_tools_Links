"use client";

import { useState } from "react";
import { resolveImageUrl } from "@/lib/image";
import { FeedbackButton } from "@/components/FeedbackButton";
import { UpcomingVote } from "@/components/UpcomingVote";

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
      <div className="flex h-20 items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
        <span className="font-serif text-3xl font-bold text-white/90">
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
      className="h-20 w-full bg-white object-cover grayscale"
    />
  );
}

function UpcomingCard({
  item,
  signedIn,
  index,
}: {
  item: UpcomingItem;
  signedIn: boolean;
  index: number;
}) {
  return (
    <div
      style={{ "--i": index } as React.CSSProperties}
      className="anim-fade-up stagger relative flex h-full cursor-default flex-col overflow-hidden rounded-xl border border-dashed border-black/15 bg-white opacity-95 shadow-sm">
      <div className="relative overflow-hidden border-b border-black/5">
        <Banner item={item} />
        <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Coming soon
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3" title={item.description ?? item.name}>
        <h3 className="truncate text-center text-sm font-semibold text-black">
          {item.name}
        </h3>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 border-t border-black/5 pt-2.5">
          <UpcomingVote id={item.id} initialCount={item.voteCount} />
          <FeedbackButton
            targetType="UPCOMING"
            targetId={item.id}
            targetName={item.name}
            variant="upcoming"
            animated={false}
            hideEmail={signedIn}
            className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold text-neutral-600 transition hover:border-brand hover:text-brand"
          />
        </div>
      </div>
    </div>
  );
}

export function UpcomingCards({
  items,
  signedIn = false,
}: {
  items: UpcomingItem[];
  signedIn?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-bold tracking-tight text-black">
          Coming soon
        </h2>
        <p className="text-sm text-neutral-500">In the works, not live yet.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item, i) => (
          <UpcomingCard key={item.id} item={item} signedIn={signedIn} index={i} />
        ))}
      </div>
    </section>
  );
}
