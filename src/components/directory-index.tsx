import Link from "next/link";
import { DIRECTORY_BUCKETS, bucketLabel } from "@/lib/directory";

// The A–Z bucket grid shown on the /stocks and /etfs hub pages and at the top
// of each browse page (so crawlers and users can hop between letters).
export function DirectoryIndex({
  basePath,
  active,
}: {
  basePath: "/stocks" | "/etfs";
  active?: string;
}) {
  return (
    <nav className="dv-az-index" aria-label="Browse by first letter">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        {DIRECTORY_BUCKETS.map((b) => {
          const isActive = active != null && active.toUpperCase() === b;
          return (
            <Link
              key={b}
              href={`${basePath}/browse/${b.toLowerCase()}`}
              className="dv-action-link"
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "2.4rem",
                padding: "0.4rem 0.55rem",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontWeight: isActive ? 700 : 500,
                background: isActive ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.02)",
              }}
            >
              {bucketLabel(b)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
