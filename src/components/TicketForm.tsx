"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { submitTicket } from "@/lib/actions/tickets";
import { ACCEPT_ATTR, MAX_FILES, MAX_FILE_BYTES, checkFileSet, fmtBytes } from "@/lib/uploads";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export function TicketForm({
  tools,
  defaultToolId,
  uploadsEnabled = false,
}: {
  tools: { id: string; name: string }[];
  defaultToolId: string;
  uploadsEnabled?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(submitTicket, null);
  const [, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const pending = isPending;

  function addFiles(incoming: FileList | File[]) {
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    const problem = checkFileSet(next);
    if (problem) {
      setFileError(problem);
    } else {
      setFileError(null);
      setFiles(next);
    }
    if (picker.current) picker.current.value = "";
  }

  // Sending the form ourselves (rather than letting React reset it after the
  // action) keeps everything the person typed if the server finds a problem.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("files");
    files.forEach((f) => fd.append("files", f));
    startTransition(() => formAction(fd));
  }
  const [kind, setKind] = useState<"BUG" | "SUGGESTION">("BUG");
  const bug = kind === "BUG";

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-3.5">
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

      {uploadsEnabled && (
        <div style={{ "--i": 4 } as React.CSSProperties} className="anim-fade-up stagger text-sm">
          <input
            ref={picker}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => picker.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            className={`flex w-full flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed px-3 py-2 text-sm font-medium transition-colors ${
              dragging ? "border-brand bg-red-50 text-brand-dark" : "border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900"
            }`}
          >
            <span>
              <span aria-hidden>📎</span> Attach screenshots or files
            </span>
            <span className="text-xs font-normal text-gray-400">
              {`Optional · up to ${MAX_FILES} files, ${fmtBytes(MAX_FILE_BYTES)} each · drag and drop works`}
            </span>
          </button>
          {fileError && (
            <p key={fileError} role="alert" className="anim-shake mt-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">{fileError}</p>
          )}
          {files.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {files.map((f) => (
                <li key={f.name + f.size} className="anim-pop inline-flex max-w-[16rem] items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-0.5 pl-2.5 pr-1 text-xs text-gray-700">
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-gray-400">{fmtBytes(f.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => { setFiles(files.filter((x) => x !== f)); setFileError(null); }}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-900"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ "--i": 5 } as React.CSSProperties} className="anim-fade-up stagger flex items-center gap-4">
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
