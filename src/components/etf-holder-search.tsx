"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Suggestion = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  is_etf: boolean | null;
  is_fund: boolean | null;
};

/**
 * Search box on /etfs/top-held that resolves a typed ticker or company name
 * into a /etfs/holders/{symbol} page. Reuses the same /api/search backend the
 * global typeahead uses, but routes results to the holders view instead of
 * the stock detail page.
 */
export function EtfHolderSearch() {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = value.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        // Only stocks (non-ETF) make sense for "which ETFs hold this".
        const stockOnly = (data.results ?? []).filter((s) => !s.is_etf && !s.is_fund);
        setSuggestions(stockOnly);
        setActiveIdx(-1);
      } catch {
        /* network errors are best-effort */
      }
    }, 150);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [value]);

  function goTo(symbol: string) {
    router.push(`/etfs/holders/${symbol}`);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        goTo(suggestions[activeIdx].symbol);
      } else if (value.trim()) {
        const symbol = value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
        if (symbol) goTo(symbol);
      }
    }
  }

  return (
    <div className="dv-etf-search">
      <h3 style={{ margin: "0 0 0.6rem", fontSize: "1rem" }}>
        Which ETFs hold a specific stock?
      </h3>
      <p style={{ margin: "0 0 0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        Type a ticker or company name to see every ETF that holds it.
      </p>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder="e.g. AAPL, Microsoft, Johnson & Johnson"
          className="dv-search-input"
          autoComplete="off"
          style={{ width: "100%" }}
        />
        {suggestions.length > 0 && (
          <ul className="dv-search-suggestions" role="listbox" style={{ width: "100%", margin: "0.4rem 0 0" }}>
            {suggestions.map((s, i) => (
              <li
                key={s.symbol}
                role="option"
                aria-selected={i === activeIdx}
                className={`dv-search-suggestion ${i === activeIdx ? "dv-search-suggestion--active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  goTo(s.symbol);
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="dv-search-suggestion__symbol">{s.symbol}</span>
                <span className="dv-search-suggestion__name">{s.name ?? ""}</span>
                <span className="dv-search-suggestion__meta">
                  {s.sector ?? ""}
                  {s.exchange ? ` · ${s.exchange}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
        Or jump to a popular one:{" "}
        {["AAPL", "MSFT", "JNJ", "KO", "PG", "JPM", "XOM", "NVDA"].map((s, i) => (
          <span key={s}>
            {i > 0 && " · "}
            <Link href={`/etfs/holders/${s}`} className="dv-action-link">{s}</Link>
          </span>
        ))}
      </p>
    </div>
  );
}
