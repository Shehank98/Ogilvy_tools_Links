import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { FEATURES } from "@/lib/features";

const navLinks = [
  { href: "/", label: "Tools" },
  ...(FEATURES.workshops ? [{ href: "/workshops", label: "Workshops" }] : []),
  ...(FEATURES.tips ? [{ href: "/tips", label: "Tips & Tricks" }] : []),
  ...(FEATURES.requests ? [{ href: "/request", label: "Request a Tool" }] : []),
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav links={navLinks} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        {children}
      </main>
      <footer className="border-t border-black/10 bg-black py-6 text-center">
        <p className="font-serif text-lg font-bold text-white">Ogilvy</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">
          Tools Hub · internal portal
        </p>
      </footer>
    </>
  );
}
