"use client";

import { useEffect, useState } from "react";

export type NoticeItem = {
  id: string;
  message: string;
  type: "INFO" | "UPDATE" | "BUGFIX" | "WARNING";
};

const styles: Record<NoticeItem["type"], { bar: string; label: string }> = {
  INFO: { bar: "bg-neutral-900 text-white", label: "Notice" },
  UPDATE: { bar: "bg-brand text-white", label: "Update" },
  BUGFIX: { bar: "bg-emerald-700 text-white", label: "Fixed" },
  WARNING: { bar: "bg-amber-500 text-black", label: "Heads up" },
};

const storageKey = (n: NoticeItem) => `notice-dismissed:${n.id}`;

export function NoticeBar({ notice }: { notice: NoticeItem | null }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!notice) return;
    // Client-only: reveal the bar unless this visitor already dismissed this
    // exact notice. Runs after hydration, so the server render stays stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(storageKey(notice)) === "1");
  }, [notice]);

  if (!notice || dismissed) return null;

  const style = styles[notice.type];

  return (
    <div className={`w-full ${style.bar}`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 text-sm">
        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
          {style.label}
        </span>
        <p className="flex-1 leading-snug">{notice.message}</p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(storageKey(notice), "1");
            setDismissed(true);
          }}
          className="shrink-0 rounded p-1 text-lg leading-none opacity-70 transition hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
