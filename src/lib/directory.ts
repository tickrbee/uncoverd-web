// Shared constants for the A–Z ticker directory (the /stocks and /etfs
// internal-linking hubs that de-orphan the ticker detail pages).

// A–Z, then a single "0" bucket that captures every symbol starting with a
// digit (foreign listings like 603259.SS). The page param uses the lowercase
// letter / "0"; we uppercase for the DB prefix filter.
export const DIRECTORY_BUCKETS = [
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  "0",
] as const;

export function isValidBucket(bucket: string): boolean {
  return DIRECTORY_BUCKETS.includes(bucket.toUpperCase() as (typeof DIRECTORY_BUCKETS)[number]);
}

/** Human label for a bucket: "A" → "A", "0" → "0–9". */
export function bucketLabel(bucket: string): string {
  return bucket === "0" ? "0–9" : bucket.toUpperCase();
}

export const DIRECTORY_PAGE_SIZE = 300;
