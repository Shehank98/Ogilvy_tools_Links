import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        Tools Hub · internal portal
      </footer>
    </>
  );
}
