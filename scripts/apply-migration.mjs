// Apply a single migration file to the linked Supabase project via the
// Management API. Splits on semicolons isn't safe (we have $$ blocks), so
// we send the whole file as one query.
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-migration.mjs <path>");
  process.exit(1);
}
const ACCESS = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT = process.env.SUPABASE_PROJECT_REF ?? "llbatqfycdppdcqrocqx";
if (!ACCESS) {
  console.error("SUPABASE_ACCESS_TOKEN not set");
  process.exit(1);
}
const sql = readFileSync(file, "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${ACCESS}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const txt = await res.text();
console.log(res.status, txt.slice(0, 500));
process.exit(res.ok ? 0 : 1);
