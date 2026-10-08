import type { FeedbackKind, FeedbackPriority, FeedbackStatus } from "@prisma/client";

export const ticketCode = (n: number) => `TH-${String(n).padStart(4, "0")}`;

/** Requester-facing wording for the internal feedback statuses. */
export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  NEW: "Received",
  REVIEWING: "In review",
  PLANNED: "Planned",
  DONE: "Done",
  DISMISSED: "Closed",
};

export const PROGRESS_STEPS: FeedbackStatus[] = [
  "NEW",
  "REVIEWING",
  "PLANNED",
  "DONE",
];

export const KIND_LABEL: Record<FeedbackKind, string> = {
  BUG: "Bug",
  SUGGESTION: "Suggestion",
  IDEA: "Idea",
};

export const PRIORITY_LABEL: Record<FeedbackPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const isOpen = (s: FeedbackStatus) => s !== "DONE" && s !== "DISMISSED";
