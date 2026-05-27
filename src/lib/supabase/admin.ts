import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/env";

// Service-role clients for server-side data reads. We cache per schema so we
// can read both the `backend` schema (curated, up-to-date market data) and
// `public` (auth, user-data). Never imported on the client side — `server-only`
// guards against that.
const cache = new Map<string, SupabaseClient>();

export function getAdminClient(schema: "backend" | "public" = "public"): SupabaseClient {
  const cached = cache.get(schema);
  if (cached) return cached;
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // db.schema accepts a string at runtime; supabase-js types prefer `public`
    // unless you have a generated Database type, so we cast.
    db: { schema } as { schema: "public" },
  });
  cache.set(schema, client);
  return client;
}

export function getBackendClient(): SupabaseClient {
  return getAdminClient("backend");
}
