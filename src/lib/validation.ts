import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal(""));

export const toolSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  logoUrl: optionalUrl,
  link: z.string().trim().url("Link must be a valid URL"),
  description: z.string().trim().optional(),
  category: z.string().trim().min(1, "Category is required"),
  order: z.coerce.number().int("Order must be a whole number").default(0),
  isActive: z.coerce.boolean().default(false),
});

export const workshopSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  dateTime: z.coerce.date({ message: "A valid date & time is required" }),
  location: z.string().trim().optional(),
});

export const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().min(1, "Body is required"),
  coverImageUrl: optionalUrl,
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export const toolRequestSchema = z.object({
  requesterName: z.string().trim().min(1, "Your name is required"),
  requesterEmail: z.string().trim().email("A valid email is required"),
  toolName: z.string().trim().min(1, "Tool name / idea is required"),
  taskDescription: z
    .string()
    .trim()
    .min(10, "Please describe the task in a bit more detail"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"], {
    message: "Please pick a frequency",
  }),
  estimatedTimeSaved: z.string().trim().optional(),
  attachmentUrl: optionalUrl,
});

export const noticeSchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
  type: z.enum(["INFO", "UPDATE", "BUGFIX", "WARNING"]),
  isActive: z.coerce.boolean().default(false),
});

export const upcomingSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  bannerUrl: optionalUrl,
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  order: z.coerce.number().int("Order must be a whole number").default(0),
  isActive: z.coerce.boolean().default(false),
});

export const feedbackSchema = z.object({
  targetType: z.enum(["TOOL", "UPCOMING"]),
  targetId: z.string().trim().min(1),
  targetName: z.string().trim().min(1),
  kind: z.enum(["SUGGESTION", "BUG", "IDEA"]),
  message: z
    .string()
    .trim()
    .min(3, "Please add a little more detail")
    .max(2000, "That's a bit too long"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

export const feedbackUpdateSchema = z.object({
  status: z.enum(["NEW", "REVIEWING", "PLANNED", "DONE", "DISMISSED"]),
  adminNotes: z.string().trim().optional(),
});

export const requestUpdateSchema = z.object({
  status: z.enum(["NEW", "UNDER_REVIEW", "APPROVED", "REJECTED", "BUILT"]),
  adminNotes: z.string().trim().optional(),
});

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
