"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration is best-effort; the app works fine without it.
      });
    }
  }, []);
  return null;
}
