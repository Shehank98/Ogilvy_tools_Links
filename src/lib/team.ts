/**
 * People a ticket can be assigned to (shown in "Assign to" on the admin ticket
 * page) and the address that is emailed when a ticket is assigned to them.
 * Edit this list to add or remove people. Someone removed from the list stays
 * visible on old tickets until the next time that ticket is saved.
 */
export const TEAM = [
  { name: "Sandaruwan Perera", email: "sandaruwan.perera@ogilvy.com" },
  { name: "Hasith Dilakshana", email: "hasith.dilakshana@ogilvy.com" },
  { name: "Vithyashini Sivasundaram", email: "vithyashini.sivasundaram@ogilvy.com" },
  { name: "Ravihari Muhandiramge", email: "ravihari.muhandiramge@ogilvy.com" },
  { name: "Sachintha Gunawardane", email: "sachintha.gunawardane@ogilvy.com" },
  { name: "Shashika Wijesinghe", email: "shashika.wijesinghe@ogilvy.com" },
  { name: "Primali Dias", email: "primali.dias@ogilvy.com" },
  { name: "Shehan Kavishka", email: "shehan.kavishka@ogilvy.com" },
] as const;

export const ASSIGNEES: readonly string[] = TEAM.map((t) => t.name);

export const emailFor = (name: string): string | null =>
  TEAM.find((t) => t.name === name)?.email ?? null;

/** Keeps only known names, de-duplicated, in the team-list order. */
export function cleanAssignees(input: unknown[]): string[] {
  const wanted = new Set(input.map((v) => String(v).trim()));
  return ASSIGNEES.filter((n) => wanted.has(n));
}

export const formatAssignees = (names: string[]) =>
  names.length ? names.join(", ") : "Unassigned";
