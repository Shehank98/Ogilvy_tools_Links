"use client";

import { useEffect, useState } from "react";
import { voteUpcoming } from "@/lib/actions/feedback";

const key = (id: string) => `upcoming-voted:${id}`;

export function UpcomingVote({
  id,
  initialCount,
}: {
  id: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoted(localStorage.getItem(key(id)) === "1");
  }, [id]);

  const vote = async () => {
    if (voted) return;
    setVoted(true);
    setCount((c) => c + 1);
    localStorage.setItem(key(id), "1");
    const fd = new FormData();
    fd.set("id", id);
    await voteUpcoming(fd);
  };

  return (
    <button
      type="button"
      onClick={vote}
      disabled={voted}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        voted
          ? "cursor-default border-brand/30 bg-brand-light text-brand-dark"
          : "border-black/15 text-neutral-600 hover:border-brand hover:text-brand"
      }`}
    >
      <span>👍</span>
      <span>{voted ? "You'd use this" : "I'd use this"}</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
