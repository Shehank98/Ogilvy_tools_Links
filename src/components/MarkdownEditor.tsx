"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-96 animate-pulse rounded-md border border-gray-200 bg-gray-50" />
  ),
});

export function MarkdownEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <div data-color-mode="light">
      <MDEditor value={value} onChange={(v) => setValue(v ?? "")} height={400} />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
