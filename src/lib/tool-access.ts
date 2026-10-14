import type { Prisma } from "@prisma/client";

/** Which tools a person may see: active ones that are open to everyone, plus
 *  the ones whose list of allowed people includes them. */
export function visibleToolsWhere(userId: string | null): Prisma.ToolWhereInput {
  return {
    isActive: true,
    OR: [
      { visibility: "EVERYONE" },
      ...(userId ? [{ visibility: "SELECTED" as const, access: { some: { userId } } }] : []),
    ],
  };
}

/** "Visible to" wording for admin screens. */
export function visibilityLabel(visibility: string, people: number): string {
  return visibility === "EVERYONE" ? "Everyone" : people === 0 ? "Nobody yet" : `${people} ${people === 1 ? "person" : "people"}`;
}
