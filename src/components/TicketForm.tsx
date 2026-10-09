"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { submitTicket } from "@/lib/actions/tickets";
import { ACCEPT_ATTR, MAX_FILES, MAX_FILE_BYTES, checkFileSet, fmtBytes } from "@/lib/uploads";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

const delay = (i: number) => ({ "--i": i }) as React.CSSProperties;

/**
 * The whole "Report to us" card. It always fits the window: the heading and the
 * Submit button stay put, and only the fields in between scroll if the window
 * is too short to show them all.
 */
export function TicketForm({
  tools,
  defaultToolId,
  uploadsEnabled = false,
}: {
  tools: { id: string; name: string }[];
  defaultToolId: string;
  uploadsEnabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitTicket, null);
  const [, startTransition] = useTransition();
  const [kind, setKind] = useState<"BUG" | "SUGGESTION">("BUG");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const bug = kind === "BUG";

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

  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 min-w-0 flex-col">
      {/* Heading + type switch: always visible */}
      <div className="flex flex-none flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report to us</h1>
          <p className="mt-0.5 text-sm text-gray-600">Found a bug or have an idea? Tell us.</p>
        </div>
        <fieldset className="flex-none">
          <legend className="sr-only">What are you raising?</legend>
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
      </div>

      {state?.error && (
        <p key={state.error} role="alert" className="anim-shake mt-3 flex-none rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {/* The fields: scroll inside the card only when the window is very short */}
      <div className="mt-3 flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-1">
        <div style={delay(0)} className="anim-fade-up stagger grid flex-none gap-3 sm:grid-cols-[1fr_11rem]">
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

        <label style={delay(1)} className="anim-fade-up stagger block flex-none text-sm">
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

        <label style={delay(2)} className="anim-fade-up stagger flex min-h-[6.5rem] flex-1 flex-col text-sm">
          <span className="mb-1 block flex-none font-medium text-gray-700">
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
          <div style={delay(3)} className="anim-fade-up stagger min-w-0 flex-none text-sm">
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
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              title={`Optional. Up to ${MAX_FILES} files, ${fmtBytes(MAX_FILE_BYTES)} each. You can also drag and drop.`}
              className={`flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-1.5 text-sm font-medium transition-colors ${
                dragging ? "border-brand bg-red-50 text-brand-dark" : "border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900"
              }`}
            >
              <span aria-hidden>📎</span>
              <span>Attach screenshots or files</span>
              <span className="hidden text-xs font-normal text-gray-400 sm:inline">
                {`optional · up to ${MAX_FILES} files, ${fmtBytes(MAX_FILE_BYTES)} each`}
              </span>
            </button>
            {fileError && (
              <p key={fileError} role="alert" className="anim-shake mt-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-700">
                {fileError}
              </p>
            )}
            {files.length > 0 && (
              // One slim, sideways-scrolling row, so five files never grow the card.
              <ul className="mt-1.5 flex w-full min-w-0 gap-1.5 overflow-x-auto pb-1">
                {files.map((f) => (
                  <li
                    key={f.name + f.size}
                    className="anim-pop inline-flex max-w-[14rem] shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-0.5 pl-2.5 pr-1 text-xs text-gray-700"
                  >
                    <span className="truncate" title={f.name}>{f.name}</span>
                    <span className="shrink-0 text-gray-400">{fmtBytes(f.size)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => {
                        setFiles(files.filter((x) => x !== f));
                        setFileError(null);
                      }}
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
      </div>

      {/* Submit: pinned to the bottom of the card */}
      <div className="flex flex-none items-center gap-4 border-t border-gray-100 pt-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? (
            <>
              <span className="spinner" />
              Submitting…
            </>
          ) : (
            "Submit ticket"
          )}
        </button>
        <span className="text-xs text-gray-500">
          {files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"} attached · ` : ""}
          You&apos;ll get a confirmation email with your ticket number.
        </span>
      </div>
    </form>
  );
}
