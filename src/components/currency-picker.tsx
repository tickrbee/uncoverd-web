"use client";

import { useEffect, useState } from "react";

const OPTIONS = [
  { code: "native", label: "Native" },
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "JPY", label: "JPY (¥)" },
  { code: "CAD", label: "CAD (C$)" },
  { code: "AUD", label: "AUD (A$)" },
  { code: "CHF", label: "CHF" },
];

const COOKIE = "displayCurrency";

function readCookie(): string {
  if (typeof document === "undefined") return "native";
  const m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "native";
}

export function CurrencyPicker() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>("native");

  useEffect(() => {
    setValue(readCookie());
  }, []);

  function select(code: string) {
    document.cookie = `${COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setValue(code);
    setOpen(false);
    // Reload so server components pick up the new cookie
    window.location.reload();
  }

  const active = OPTIONS.find((o) => o.code === value) ?? OPTIONS[0];

  return (
    <div className="dv-currency-picker" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="dv-currency-picker__btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Display currency"
        title="Display currency"
      >
        {active.label}
      </button>
      {open && (
        <div className="dv-currency-picker__menu" role="menu">
          {OPTIONS.map((o) => (
            <button
              key={o.code}
              type="button"
              className={`dv-currency-picker__item ${o.code === value ? "dv-currency-picker__item--active" : ""}`}
              onClick={() => select(o.code)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
