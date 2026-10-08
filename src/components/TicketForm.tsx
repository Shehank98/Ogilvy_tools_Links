"use client";

import { useActionState, useState } from "react";
import { submitTicket } from "@/lib/actions/tickets";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export function TicketForm({
  tools,
  defaultToolId,
}: {
  tools: { id: string; name: string }[];
  defaultToolId: string;
}) {
  const [state, formAction, pending] = useActionState(submitTicket, null);
  const [kind, setKind] = useState<"BUG" | "SUGGESTION">("BUG");
  const bug = kind === "BUG";

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col gap-3.5">
      {state?.error && (
        <p key={state.error} role="alert" className="anim-shake rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="space-y-4">
        <fieldset style={{ "--i": 0 } as React.CSSProperties} className="anim-fade-up stagger">
          <legend className="mb-1 text-sm font-medium text-gray-700">
            What are you raising?
          </legend>
          <div className="inline-flex overflow-hidden rounded-md border border-black">
            {(
              [
                ["BUG", "🐞 Bug"],
                ["SUGGESTION", "💡 Suggestion"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
                  kind === value ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div style={{ "--i": 1 } as React.CSSProperties} className="anim-fade-up stagger grid gap-4 sm:grid-cols-[1fr_11rem]">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Tool affected</span>
          <select name="targetId" defaultValue={defaultToolId} className={inputClass}>
            <option value="general">General / not tool-specific</option>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Priority</span>
          <select name="priority" defaultValue="MEDIUM" className={inputClass}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>
        </div>
      </div>

      <label style={{ "--i": 2 } as React.CSSProperties} className="anim-fade-up stagger block text-sm">
        <span className="mb-1 block font-medium text-gray-700">Title</span>
        <input
          name="title"
          required
          minLength={5}
          maxLength={120}
          placeholder={bug ? "e.g. Report export fails for files over 10 MB" : "e.g. Add dark mode to Brief Builder"}
          className={inputClass}
        />
      </label>

      <label style={{ "--i": 3 } as React.CSSProperties} className="anim-fade-up stagger flex min-h-32 flex-1 flex-col text-sm lg:min-h-24">
        <span className="mb-1 block font-medium text-gray-700">
          {bug ? "Describe the problem" : "Describe your suggestion"}
        </span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={3}
          placeholder={
            bug
              ? "What happened? What did you expect to happen?"
              : "What would you improve, and how would it help you or your team?"
          }
          className={`${inputClass} min-h-0 flex-1 resize-none`}
        />
      </label>

      <div style={{ "--i": 4 } as React.CSSProperties} className="anim-fade-up stagger flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? (<><span className="spinner" />Submitting…</>) : "Submit ticket"}
        </button>
        <span className="text-xs text-gray-500">
          You&apos;ll get a confirmation email with your ticket number.
        </span>
      </div>
    </form>
  );
}
