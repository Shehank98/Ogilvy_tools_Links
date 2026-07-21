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
    </>
  );
}
