// Server-side: turn a DB ticker row (+ optional rating) into the instrument
// shape the Portfolio Generator engine consumes. Shared by the universe route
// (bulk) and the single-instrument lookup (user-pinned anchors like QQQI).
//
// Real fields: symbol, name, sector, yield, beta, grade. vol/er are model
// estimates derived from beta + rating — we don't store expected returns.

import type { StockRow, StockRating } from "@/lib/types";
import type { GenInstrument } from "@/components/generator/types";

const GRADE_Q: Record<string, number> = {
  "A+": 96, A: 92, "A-": 87, "B+": 80, B: 72, "B-": 64, "C+": 56, C: 50,
};

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function stockToGenInstrument(r: StockRow, rt?: StockRating | null): GenInstrument {
  const yld = r.dividend_yield ?? 0;
  const beta = r.beta ?? 1;

  if (r.is_etf || r.is_fund) {
    // Arbitrary (non-curated) fund: classify by asset class + yield.
    const isBond = /bond|fixed income|treasur/i.test(`${r.asset_class ?? ""} ${r.etf_category ?? ""} ${r.name ?? ""}`);
    if (isBond) {
      return {
        tk: r.symbol, name: r.name ?? r.symbol, cls: "bond", kind: "bond", sector: "Fixed Income",
        yield: +yld.toFixed(2), beta: +clamp(beta, -0.5, 0.6).toFixed(2),
        vol: +clamp(4 + Math.abs(beta) * 8, 1, 16).toFixed(1), er: +clamp(3.5 + Math.min(yld, 6) * 0.25, 3, 6).toFixed(1),
        q: 86, rate: "A-", etf: true, type: "bond",
      };
    }
    const kind: GenInstrument["kind"] = yld >= 2.5 ? "div" : "broad";
    return {
      tk: r.symbol, name: r.name ?? r.symbol, cls: "eq", kind,
      sector: r.sector ?? "Diversified",
      yield: +yld.toFixed(2), beta: +beta.toFixed(2),
      vol: +clamp(13 + (beta - 1) * 12, 6, 30).toFixed(1),
      er: +clamp(6.5 + (beta - 1) * 2 + Math.min(yld, 8) * 0.12, 4, 11).toFixed(1),
      q: kind === "div" ? 80 : 78, rate: "B+", etf: true, type: "etf",
    };
  }

  const grade = rt?.composite_grade ?? null;
  const q = grade ? GRADE_Q[grade] ?? 60 : 58;
  const smallCap = (r.market_cap ?? 0) < 10e9;
  const vol = clamp(12 + (beta - 1) * 15 + (smallCap ? 4 : 0), 9, 50);
  const er = clamp(5 + (q - 50) * 0.09 + Math.max(0, beta - 1) * 1.8 + Math.min(yld, 6) * 0.1, 4, 14);
  return {
    tk: r.symbol, name: r.name ?? r.symbol, cls: "eq", kind: "stock",
    sector: r.sector ?? "Diversified",
    country: r.country ?? undefined,
    capUsd: r.market_cap ?? undefined,
    yield: +yld.toFixed(2), beta: +beta.toFixed(2), vol: +vol.toFixed(1), er: +er.toFixed(1),
    q, rate: grade ?? "—", etf: false, type: "stock",
  };
}
