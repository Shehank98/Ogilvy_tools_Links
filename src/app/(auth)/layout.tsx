import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-0 flex-1 overflow-y-auto">
      {/* Slow drifting colour behind the sign-in screen. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="anim-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/25 blur-3xl" />
        <div className="anim-drift absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-amber-300/30 blur-3xl [animation-delay:-6s]" />
        <div className="anim-drift absolute left-1/2 top-1/3 h-72 w-72 rounded-full bg-rose-300/25 blur-3xl [animation-delay:-11s]" />
      </div>
      <div className="relative m-auto w-full max-w-5xl px-4 py-6">{children}</div>
    </main>
  );
}
