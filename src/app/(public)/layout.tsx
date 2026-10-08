import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { NoticeBar } from "@/components/NoticeBar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { FEATURES } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

const navLinks = [
  { href: "/", label: "Tools" },
  ...(FEATURES.workshops ? [{ href: "/workshops", label: "Workshops" }] : []),
  ...(FEATURES.tips ? [{ href: "/tips", label: "Tips & Tricks" }] : []),
  ...(FEATURES.requests ? [{ href: "/request", label: "Request a Tool" }] : []),
  ...(FEATURES.userLogin
    ? [
        { href: "/report", label: "Report to us" },
        { href: "/tickets", label: "My Tickets" },
      ]
    : []),
];

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Everything in this group needs a signed-in staff account.
  const user = await requireUser();
  const openTickets = user
    ? await prisma.feedback
        .count({
          where: { userId: user.id, status: { notIn: ["DONE", "DISMISSED"] } },
        })
        .catch(() => 0)
    : 0;

  const row = await prisma.notice
    .findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, message: true, type: true, updatedAt: true },
    })
    .catch(() => null);
  const notice = row
    ? {
        id: row.id,
        message: row.message,
        type: row.type,
        version: String(row.updatedAt.getTime()),
      }
    : null;

  return (
    <>
      <AutoRefresh />
      <NoticeBar notice={notice} />
      <Nav
        links={navLinks}
        user={user ? { name: user.name, email: user.email } : null}
        openTickets={openTickets}
      />
      {/* The page itself never scrolls: the header stays put and, only if the
          content is taller than the window, this area scrolls on its own. */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-6xl px-4 py-5">
          {children}
        </div>
      </main>
    </>
  );
}
