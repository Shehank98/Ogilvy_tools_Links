import type { ReactNode } from "react";

// A template (unlike a layout) re-mounts on every navigation, so each page
// fades up as you move between Tools, Report and My Tickets.
export default function PublicTemplate({ children }: { children: ReactNode }) {
  return <div className="anim-fade-up">{children}</div>;
}
