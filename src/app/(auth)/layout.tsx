import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-0 flex-1 overflow-y-auto">
      <div className="m-auto w-full max-w-5xl px-4 py-6">{children}</div>
    </main>
  );
}
