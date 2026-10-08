"use client";

import { useEffect, useRef, useState } from "react";

/** Counts a number up from where it was (0 on first load) with an ease-out. */
export function CountUp({
  to,
  suffix = "",
  duration = 900,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    if (
      start === to ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      from.current = to;
      setValue(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (to - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return (
    <span className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}
