// Runs before `next start`. Applies pending Prisma migrations, and NEVER stops
// the app from starting: a failed migration is reported loudly (and by
// /api/health) instead of putting the server into a crash loop.
//
// Special case: a database that was created without Prisma's migration history
// (e.g. with `prisma db push`) makes `migrate deploy` fail with P3005. If that
// database matches the schema the older migrations produce (prisma/baseline.prisma),
// the old migrations are recorded as already applied ("baselined") and the new
// ones are then applied normally.
import { spawnSync } from "node:child_process";

const BASELINE = [
  "0_init",
  "20260721_notices_upcoming",
  "20260721_feedback_votes",
  "20260721_tool_beta",
];

function prisma(args) {
  const r = spawnSync("npx", ["--no-install", "prisma", ...args], { encoding: "utf8" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return { ok: r.status === 0, out };
}

function say(msg) {
  console.log(`[migrate] ${msg}`);
}

let r = prisma(["migrate", "deploy"]);
console.log(r.out);

if (!r.ok && r.out.includes("P3005")) {
  say("Database has no migration history. Checking it matches the baseline schema…");
  const diff = prisma([
    "migrate", "diff",
    "--from-url", process.env.DATABASE_URL ?? "",
    "--to-schema-datamodel", "prisma/baseline.prisma",
    "--exit-code",
  ]);
  if (diff.ok) {
    say("Matches. Recording the original migrations as applied…");
    for (const m of BASELINE) {
      const res = prisma(["migrate", "resolve", "--applied", m]);
      if (!res.ok) console.log(res.out);
    }
    r = prisma(["migrate", "deploy"]);
    console.log(r.out);
  } else {
    say("Database differs from the baseline schema, so it was NOT baselined automatically.");
    console.log(diff.out);
  }
}

if (r.ok) {
  say("Database is up to date.");
} else {
  say("WARNING: migrations were NOT applied. The app will start, but pages that need the new tables will fail.");
  say("Check /api/health, then see the README section on migrating an existing database.");
}
process.exit(0);
