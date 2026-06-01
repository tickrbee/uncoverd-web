// Shared stat card, used by both server-rendered public panels and the
// client-rendered premium panels on the stock page. No "use client" so it works
// in either context.
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="dv-stat-card">
      <p className="dv-stat-card__label">{label}</p>
      <p className="dv-stat-card__value">{value}</p>
    </div>
  );
}
