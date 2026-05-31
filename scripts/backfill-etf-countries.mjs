// One-shot: pull country weights for top ETFs from FMP and write to
// backend.etf_country_weightings via the Supabase Management API.
// Run with: node scripts/backfill-etf-countries.mjs
import "node:fs";

const FMP = process.env.FMP_API_KEY;
const ACCESS = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT = "llbatqfycdppdcqrocqx";

if (!FMP || !ACCESS) {
  console.error("Missing FMP_API_KEY or SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const SYMBOLS = [
  "SPY","HDV","SCHD","JEPI","VOO","VTI","VWO","VXUS","VEA","QQQ",
  "IVV","IWM","DGRO","DVY","SPHD","NOBL","VIG","VYM","JEPQ","VT",
  "IEMG","IEFA","EFA","DIA","SPLG","BND","AGG","TLT","GLD","SLV",
  "USO","XLF","XLE","XLK","XLV","XLY","XLP","XLI","XLU","XLB","XLRE","XLC",
];

function sanitizeWeight(w) {
  if (typeof w === "number" && isFinite(w)) return w;
  if (typeof w === "string") {
    const n = parseFloat(w.replace(/[%,\s]/g, ""));
    return isFinite(n) ? n : null;
  }
  return null;
}

async function runSql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${txt}`);
  return txt;
}

let total = 0;
for (const sym of SYMBOLS) {
  try {
    const r = await fetch(`https://financialmodelingprep.com/stable/etf/country-weightings?symbol=${encodeURIComponent(sym)}&apikey=${FMP}`);
    if (!r.ok) { console.error(sym, "fmp", r.status); continue; }
    const items = await r.json();
    if (!Array.isArray(items) || items.length === 0) { console.log(sym, "no data"); continue; }
    const seen = new Set();
    const rows = [];
    for (const it of items) {
      if (!it.country || seen.has(it.country)) continue;
      seen.add(it.country);
      rows.push({ country: it.country, w: sanitizeWeight(it.weightPercentage) });
    }
    if (!rows.length) continue;
    const escape = (s) => s.replace(/'/g, "''");
    const values = rows
      .map((row) => `('${escape(sym)}','${escape(row.country)}',${row.w === null ? "NULL" : row.w})`)
      .join(",");
    const sql = `delete from backend.etf_country_weightings where etf_symbol='${escape(sym)}'; insert into backend.etf_country_weightings (etf_symbol,country,weight_percentage) values ${values};`;
    await runSql(sql);
    total += rows.length;
    console.log(sym, "OK", rows.length, "rows");
  } catch (e) {
    console.error(sym, "ERR", String(e));
  }
}
console.log("TOTAL", total);
