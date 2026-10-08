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
  const [kind, setKind] = useState<"BUG" | "SUGGESTION" | "IDEA">("BUG");
  const bug = kind === "BUG";

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="space-y-4">
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-gray-700">
            What are you raising?
          </legend>
          <div className="inline-flex overflow-hidden rounded-md border border-black">
            {(
              [
                ["BUG", "🐞 Bug"],
                ["SUGGESTION", "💡 Suggestion"],
                ["IDEA", "✨ Idea"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer px-3.5 py-2 text-sm font-semibold ${
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

        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
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

      <label className="block text-sm">
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

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-700">
          {bug ? "Describe the problem" : "Describe your suggestion"}
        </span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder={
            bug
              ? "What happened? What did you expect to happen?"
              : "What would you improve, and how would it help you or your team?"
          }
          className={inputClass}
        />
      </label>

      {bug && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">
            Steps to reproduce <span className="font-normal text-gray-400">(optional)</span>
          </span>
          <textarea
            name="steps"
            maxLength={3000}
            rows={4}
            placeholder={"1. Open…\n2. Click…\n3. See error…"}
            className={inputClass}
          />
        </label>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit ticket"}
        </button>
        <span className="text-xs text-gray-500">
          You&apos;ll get a confirmation email with your ticket number.
        </span>
      </div>
    </form>
  );
}
