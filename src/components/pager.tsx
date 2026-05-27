import Link from "next/link";

export function Pager({
  page,
  totalPages,
  baseHref,
}: {
  page: number;
  totalPages: number;
  baseHref: string; // e.g. "/screener?sector=energy"
}) {
  if (totalPages <= 1) return null;

  const sep = baseHref.includes("?") ? "&" : "?";
  const hrefFor = (p: number) => `${baseHref}${sep}page=${p}`;

  const pages: (number | "…")[] = [];
  const showAround = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - showAround && i <= page + showAround)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <nav className="dv-pager" aria-label="Pagination">
      <Link
        href={page > 1 ? hrefFor(page - 1) : "#"}
        className={page > 1 ? "" : "dv-pager--disabled"}
        aria-label="Previous page"
      >
        ‹ Prev
      </Link>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`}>…</span>
        ) : p === page ? (
          <span key={p} className="dv-pager--current" aria-current="page">
            {p}
          </span>
        ) : (
          <Link key={p} href={hrefFor(p)}>
            {p}
          </Link>
        )
      )}
      <Link
        href={page < totalPages ? hrefFor(page + 1) : "#"}
        className={page < totalPages ? "" : "dv-pager--disabled"}
        aria-label="Next page"
      >
        Next ›
      </Link>
    </nav>
  );
}
