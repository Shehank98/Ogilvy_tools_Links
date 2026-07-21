"use client";

import { useActionState, useEffect, useState } from "react";
import { submitFeedback } from "@/lib/actions/feedback";

type Props = {
  targetType: "TOOL" | "UPCOMING";
  targetId: string;
  targetName: string;
  variant?: "tool" | "upcoming";
  animated?: boolean;
  className?: string;
};

export function FeedbackButton({
  targetType,
  targetId,
  targetName,
  variant = "tool",
  animated = true,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitFeedback, null);

  // Close automatically a moment after a successful submit.
  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(() => setOpen(false), 1600);
      return () => clearTimeout(t);
    }
  }, [state?.success]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isUpcoming = variant === "upcoming";
  const label = isUpcoming ? "Share an idea" : "Suggest";

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`group/fb inline-flex items-center ${className}`}
      >
        <span aria-hidden>💡</span>
        {animated ? (
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover/fb:ml-1 group-hover/fb:max-w-[8rem] group-hover/fb:opacity-100 group-focus-visible/fb:ml-1 group-focus-visible/fb:max-w-[8rem] group-focus-visible/fb:opacity-100">
            {label}
          </span>
        ) : (
          <span className="ml-1 whitespace-nowrap">{label}</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-black">
                  {isUpcoming ? "Help shape this" : "Send feedback"}
                </h2>
                <p className="mt-0.5 text-sm text-neutral-500">{targetName}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-xl leading-none text-neutral-400 hover:text-black"
              >
                ×
              </button>
            </div>

            {state?.success ? (
              <p className="rounded-lg bg-green-50 px-4 py-6 text-center text-sm font-medium text-green-700">
                {state.success}
              </p>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="targetType" value={targetType} />
                <input type="hidden" name="targetId" value={targetId} />
                <input type="hidden" name="targetName" value={targetName} />

                {state?.error && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                  </p>
                )}

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">
                    Type
                  </span>
                  <select
                    name="kind"
                    defaultValue={isUpcoming ? "IDEA" : "SUGGESTION"}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="SUGGESTION">Suggestion</option>
                    <option value="IDEA">Idea / feature</option>
                    <option value="BUG">Bug / problem</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">
                    {isUpcoming
                      ? "What would you love this to do?"
                      : "Your message"}
                  </span>
                  <textarea
                    name="message"
                    rows={4}
                    required
                    placeholder={
                      isUpcoming
                        ? "Tell us the features or workflow you'd want…"
                        : "Share a suggestion, idea, or problem…"
                    }
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">
                    Email{" "}
                    <span className="font-normal text-neutral-400">
                      (optional, if you want a reply)
                    </span>
                  </span>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@company.com"
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </label>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {pending ? "Sending…" : "Send feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
