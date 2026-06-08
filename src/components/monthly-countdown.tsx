"use client";

import React from "react";

// Motley-Fool-style urgency: counts down to the 1st of next month (UTC), when
// the pinned monthly pick refreshes. Honest (it really does refresh then) and
// creates a reason to act now.
export function MonthlyCountdown({ accent = "#15b87f", label = "until this month's pick refreshes" }: { accent?: string; label?: string }) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now == null) return null; // avoid SSR/client mismatch — render after mount

  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0);
  let s = Math.max(0, Math.floor((next - now) / 1000));
  const days = Math.floor(s / 86400); s -= days * 86400;
  const hrs = Math.floor(s / 3600); s -= hrs * 3600;
  const mins = Math.floor(s / 60); const secs = s - mins * 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const Box = ({ v, l }: { v: string; l: string }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 46 }}>
      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "1.35rem", fontWeight: 800, color: accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{v}</span>
      <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginTop: 4 }}>{l}</span>
    </div>
  );
  const Sep = () => <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-muted)", alignSelf: "flex-start", lineHeight: 1.1 }}>:</span>;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <Box v={pad(days)} l="days" /><Sep />
        <Box v={pad(hrs)} l="hrs" /><Sep />
        <Box v={pad(mins)} l="min" /><Sep />
        <Box v={pad(secs)} l="sec" />
      </div>
      <span style={{ fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
