"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Silently re-fetches the current route's server components on an interval, so
 * new content (notices, tools, feedback, etc.) appears without a manual
 * refresh. router.refresh() preserves client state — search inputs, open
 * modals and scroll position are kept.
 */
export function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      // Skip while the tab is hidden to avoid pointless background requests.
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
