"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { logToolClick } from "@/lib/actions/public";
import { resolveImageUrl } from "@/lib/image";
import { FEATURES } from "@/lib/features";
import { FeedbackButton } from "@/components/FeedbackButton";

export type ToolItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  link: string;
  description: string | null;
  category: string;
  isBeta: boolean;
  subtitle: string | null;
  about: string | null;
  purpose: string | null;
  initiatedBy: string | null;
  developedBy: string | null;
  team: string | null;
  advisory: string | null;
};

/** A soft colour per tool name, used when a tool has no logo image yet. */
export function toolHue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function LogoTile({
  name,
  logoUrl,
  className = "",
  muted = false,
}: {
  name: string;
  logoUrl: string | null;
  className?: string;
  muted?: boolean;
}) {
  const src = FEATURES.toolLogos ? resolveImageUrl(logoUrl) : null;
  const [failed, setFailed] = useState(false);
  const hue = toolHue(name);
  const box = `flex items-center justify-center overflow-hidden ${muted ? "grayscale" : ""} ${className}`;

  if (!src || failed) {
    return (
      <div
        className={box}
        style={{ background: `hsl(${hue} 85% 94%)`, color: `hsl(${hue} 60% 36%)` }}
        aria-hidden
      >
        <span className="font-serif text-5xl font-bold">{name.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <div className={`${box} border border-black/5 bg-neutral-50`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-3"
      />
    </div>
  );
}

const LOGO_SIZE = "h-24 w-24 rounded-[1.6rem] sm:h-28 sm:w-28 sm:rounded-[1.75rem]";

/* ------------------------------- details pop-up ------------------------------ */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 rounded-2xl bg-slate-100/80 px-5 py-3.5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">{label}</h3>
      <div className="mt-1 text-[15px] leading-relaxed text-slate-800">{children}</div>
    </section>
  );
}

function ToolDialog({
  tool,
  signedIn,
  onClose,
}: {
  tool: ToolItem;
  signedIn: boolean;
  onClose: () => void;
}) {
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const about = tool.about || tool.description;
  const bullets = (tool.purpose ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

  return createPortal(
    <div
      className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[3px] sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-dialog-title"
        className="anim-pop flex max-h-[92vh] w-full max-w-[40rem] flex-col rounded-[1.6rem] bg-gradient-to-b from-white to-slate-50 shadow-2xl"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-6 sm:px-9 sm:pt-8">
          <div className="flex items-start gap-4 sm:gap-5">
            <LogoTile name={tool.name} logoUrl={tool.logoUrl} className="h-16 w-16 shrink-0 rounded-2xl sm:h-[5.25rem] sm:w-[5.25rem] sm:rounded-[1.4rem]" />
            <div className="min-w-0 flex-1">
              <h2 id="tool-dialog-title" className="font-serif text-2xl font-bold leading-tight text-brand sm:text-3xl">
                {tool.name}
              </h2>
              {tool.subtitle && <p className="mt-1 text-sm text-neutral-500">{tool.subtitle}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] font-semibold">
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">{tool.category}</span>
                {tool.isBeta && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Beta</span>}
              </div>
            </div>
            <button
              ref={closeBtn}
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-brand text-2xl leading-none text-brand transition hover:bg-brand hover:text-white"
            >
              ×
            </button>
          </div>

          {about && <Section label="About this tool"><p className="whitespace-pre-line">{about}</p></Section>}
          {bullets.length > 0 && (
            <Section label="What it's for">
              <ul className="list-disc space-y-0.5 pl-5">
                {bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Section>
          )}
          {tool.initiatedBy && <Section label="Initiated by">{tool.initiatedBy}</Section>}
          {tool.developedBy && <Section label="Developed by">{tool.developedBy}</Section>}
          {tool.team && <Section label="Team">{tool.team}</Section>}
          {tool.advisory && <Section label="Advisory team">{tool.advisory}</Section>}
          {!about && bullets.length === 0 && (
            <p className="mt-4 rounded-2xl bg-slate-100/80 px-5 py-4 text-sm text-neutral-500">
              No description has been added for this tool yet.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 pb-6 pt-4 sm:px-9">
          <a
            href={tool.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              logToolClick(tool.id);
              onClose();
            }}
            className="inline-flex min-w-[12rem] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-brand-dark"
          >
            Open tool <span aria-hidden>↗</span>
          </a>
          <FeedbackButton
            targetType="TOOL"
            targetId={tool.id}
            targetName={tool.name}
            variant="tool"
            animated={false}
            hideEmail={signedIn}
            className="text-sm font-medium text-neutral-500 hover:text-brand"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

/* --------------------------------- the grid --------------------------------- */

function ToolCard({
  tool,
  signedIn,
  index,
  onOpen,
}: {
  tool: ToolItem;
  signedIn: boolean;
  index: number;
  onOpen: (t: ToolItem, trigger: HTMLElement) => void;
}) {
  return (
    <div
      className="anim-fade-up stagger group relative h-full"
      style={{ "--i": index } as React.CSSProperties}
    >
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(e) => onOpen(tool, e.currentTarget)}
        className="flex h-full w-full flex-col items-center gap-4 rounded-[1.4rem] border border-black/10 bg-white px-4 pb-5 pt-8 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/60 hover:shadow-[0_18px_34px_-14px_rgba(238,49,36,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:translate-y-0 active:scale-[0.98]"
      >
        <span className="shine block rounded-[1.75rem] transition duration-300 group-hover:scale-105">
          <LogoTile name={tool.name} logoUrl={tool.logoUrl} className={LOGO_SIZE} />
        </span>
        <h3 className="text-lg font-bold leading-tight tracking-tight text-black sm:text-[19px]">{tool.name}</h3>
        <span className="mt-auto text-xs font-medium text-neutral-400 transition-colors group-hover:text-brand">
          View details →
        </span>
      </button>
      {tool.isBeta && (
        <span
          title="Beta: still being tested, you may run into errors."
          className="pointer-events-none absolute left-3.5 top-3.5 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"
        >
          Beta
        </span>
      )}
      <FeedbackButton
        targetType="TOOL"
        targetId={tool.id}
        targetName={tool.name}
        variant="tool"
        hideEmail={signedIn}
        className="absolute right-3 top-3 z-10 rounded-full border border-black/10 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur transition hover:border-brand hover:text-brand"
      />
    </div>
  );
}

export function ToolDirectory({
  tools,
  signedIn = false,
}: {
  tools: ToolItem[];
  signedIn?: boolean;
}) {
  const [open, setOpen] = useState<ToolItem | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  if (tools.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center">
        <p className="text-sm text-neutral-500">
          There are no tools available to you yet. If you think you should have access, ask the Automation team.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {tools.map((tool, i) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            signedIn={signedIn}
            index={i}
            onOpen={(t, el) => {
              trigger.current = el;
              setOpen(t);
            }}
          />
        ))}
      </div>
      {open && (
        <ToolDialog
          tool={open}
          signedIn={signedIn}
          onClose={() => {
            setOpen(null);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}
