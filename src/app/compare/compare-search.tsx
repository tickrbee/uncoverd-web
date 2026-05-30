"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Add-a-ticker input for /compare. Hits the same /api/search endpoint the
// header search uses, so typeahead semantics match. On submit (or click of
// a suggestion), navigate to /compare with the chosen symbol filling the
// next open slot.

type Suggestion = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  is_etf: boolean | null;
  is_fund: boolean | null;
};

const SLOTS = ["a", "b", "c", "d"] as const;

export function CompareSearch({
  slot,
  currentSymbols,
}: {
  slot: (typeof SLOTS)[number];
  currentSymbols: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        // Filter out symbols already in the comparison.
        const filtered = (data.results ?? []).filter((s) => !currentSymbols.includes(s.symbol));
        setSuggestions(filtered);
        setActiveIdx(-1);
      } catch {
        /* network — best-effort typeahead */
      }
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, currentSymbols]);

  function goWith(symbol: string): void {
    const next = [...currentSymbols, symbol].slice(0, 4);
    const qs = next.map((s, i) => `${SLOTS[i]}=${encodeURIComponent(s)}`).join("&");
    router.push(`/compare?${qs}`);
  }

  function onSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      goWith(suggestions[activeIdx].symbol);
      return;
    }
    const v = value.trim().toUpperCase().replace(/[^A-Z.\-]/g, "");
    if (v.length >= 1 && v.length <= 8) {
      goWith(v);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder={
            currentSymbols.length === 0
              ? "Add a ticker — e.g. SCHD, AAPL, JEPI"
              : `Add another to compare with ${currentSymbols.join(", ")}`
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          autoComplete="off"
          aria-label="Add a ticker"
          style={{
            flex: 1,
            padding: "0.65rem 0.85rem",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: "0.92rem",
          }}
        />
        <button type="submit" className="btn">
          Add
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#0a0a0a",
            border: "1px solid var(--border)",
            borderRadius: 8,
            listStyle: "none",
            margin: 0,
            padding: "0.3rem 0",
            zIndex: 50,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {suggestions.slice(0, 10).map((s, i) => (
            <li
              key={s.symbol}
              role="option"
              aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                goWith(s.symbol);
              }}
              style={{
                padding: "0.55rem 0.85rem",
                cursor: "pointer",
                background: i === activeIdx ? "rgba(52,211,153,0.08)" : "transparent",
                display: "flex",
                gap: "0.6rem",
                alignItems: "center",
                fontSize: "0.88rem",
              }}
            >
              <strong style={{ minWidth: 60, color: "var(--text-primary)" }}>{s.symbol}</strong>
              <span style={{ flex: 1, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.name ?? ""}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {s.is_etf || s.is_fund ? "ETF" : s.sector ?? s.exchange ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Slot tuple re-exported for callers wanting to align with the server side.
export const COMPARE_SLOTS = SLOTS;
