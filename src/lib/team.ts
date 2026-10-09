/**
 * People a ticket can be assigned to (shown in "Assign to" on the admin ticket
 * page). Edit this list to add or remove people. Someone removed from the
 * list stays visible on old tickets until the next time that ticket is saved.
 */
export const ASSIGNEES = [
  "Sandaruwan Perera",
  "Hasith Dilakshana",
  "Vithyashini Sivasundaram",
  "Ravihari Muhandiramge",
  "Sachintha Gunawardane",
  "Shashika Wijesinghe",
  "Primali Dias",
  "Shehan Kavishka",
] as const;

/** Keeps only known names, de-duplicated, in the team-list order. */
export function cleanAssignees(input: unknown[]): string[] {
  const wanted = new Set(input.map((v) => String(v).trim()));
  return ASSIGNEES.filter((n) => wanted.has(n));
}

export const formatAssignees = (names: string[]) =>
  names.length ? names.join(", ") : "Unassigned";
