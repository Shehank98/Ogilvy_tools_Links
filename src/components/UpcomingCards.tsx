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
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
        <span className="font-serif text-5xl font-bold text-white/90">
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
      className="h-32 w-full bg-white object-cover grayscale"
    />
  );
}

function UpcomingCard({ item }: { item: UpcomingItem }) {
  return (
    <div className="relative flex h-full cursor-default flex-col overflow-hidden rounded-2xl border border-dashed border-black/15 bg-white opacity-95 shadow-sm">
      <div className="relative overflow-hidden border-b border-black/5">
        <Banner item={item} />
        <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          Coming soon
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="truncate text-base font-semibold text-black">
          {item.name}
        </h3>
        {item.category && (
          <span className="mt-1.5 inline-flex w-fit max-w-full truncate rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            {item.category}
          </span>
        )}
        {item.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-600">
            {item.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
          <UpcomingVote id={item.id} initialCount={item.voteCount} />
          <FeedbackButton
            targetType="UPCOMING"
            targetId={item.id}
            targetName={item.name}
            variant="upcoming"
            className="inline-flex items-center gap-1 rounded-full border border-black/15 px-3 py-1 text-xs font-semibold text-neutral-600 transition hover:border-brand hover:text-brand"
          />
        </div>
      </div>
    </div>
  );
}

export function UpcomingCards({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-bold tracking-tight text-black">
          Coming soon
        </h2>
        <p className="text-sm text-neutral-500">In the works, not live yet.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <UpcomingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
