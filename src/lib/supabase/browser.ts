"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

let client: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (client) {
    return client;
  }

  client = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  return client;
}
