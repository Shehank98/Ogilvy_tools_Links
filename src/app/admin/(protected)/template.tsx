import type { ReactNode } from "react";

export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <div className="anim-fade-up">{children}</div>;
}
