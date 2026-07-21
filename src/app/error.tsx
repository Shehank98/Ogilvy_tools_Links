"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          The server couldn&apos;t load this page — usually this means the
          database is unreachable or hasn&apos;t been migrated yet. Visit{" "}
          <a href="/api/health" className="text-indigo-600 underline">
            /api/health
          </a>{" "}
          to see what&apos;s failing.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
