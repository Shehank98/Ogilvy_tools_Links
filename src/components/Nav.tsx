"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutUser } from "@/lib/actions/user-auth";

export function Nav({
  links,
  user = null,
  openTickets = 0,
}: {
  links: { href: string; label: string }[];
  user?: { name: string; email: string } | null;
  openTickets?: number;
}) {
  const pathname = usePathname();
  return (
    <header className="z-40 shrink-0 border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
        <Link href="/" className="wiggle-hover order-1 flex items-baseline gap-2">
          <span className="font-serif text-2xl font-bold tracking-tight text-brand">
            Ogilvy
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-black">
            Tools Hub
          </span>
        </Link>
        {links.length > 1 && (
          <nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-2 md:w-auto">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-black text-white"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
                  }`}
                >
                  {link.label}
                  {link.href === "/tickets" && openTickets > 0 && (
                    <span
                      key={openTickets}
                      className="anim-pop ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                      {openTickets}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}
        {user && (
          <div className="order-2 ml-auto flex items-center gap-3 md:order-3">
            <span
              title={user.email}
              className="hidden max-w-[14rem] truncate text-sm text-neutral-500 sm:block"
            >
              {user.name}
            </span>
            <form action={logoutUser}>
              <button
                type="submit"
                className="rounded-full border border-black/15 px-3.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-black hover:text-black"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
