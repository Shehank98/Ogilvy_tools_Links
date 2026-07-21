import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { NoticeBar } from "@/components/NoticeBar";
import { FEATURES } from "@/lib/features";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const navLinks = [
  { href: "/", label: "Tools" },
  ...(FEATURES.workshops ? [{ href: "/workshops", label: "Workshops" }] : []),
  ...(FEATURES.tips ? [{ href: "/tips", label: "Tips & Tricks" }] : []),
  ...(FEATURES.requests ? [{ href: "/request", label: "Request a Tool" }] : []),
];

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const notice = await prisma.notice
    .findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, message: true, type: true },
    })
    .catch(() => null);

  return (
    <>
      <NoticeBar notice={notice} />
      <Nav links={navLinks} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        {children}
      </main>
    </>
  );
}
