export type ActionState = { error?: string; success?: string } | null;

export function firstZodError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input";
}
