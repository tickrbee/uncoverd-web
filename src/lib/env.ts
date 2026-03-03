const DEFAULT_SUPABASE_URL = "https://llbatqfycdppdcqrocqx.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYmF0cWZ5Y2RwcGRjcXJvY3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNzA4MjIsImV4cCI6MjA1MTc0NjgyMn0.8cAmyDXICoQDaX2bLXJS24TTt9atJwEP02uWEwSKs5M";

function getEnvOrDefault(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) {
    return value;
  }
  return fallback;
}

export function getSupabaseUrl(): string {
  return getEnvOrDefault("NEXT_PUBLIC_SUPABASE_URL", DEFAULT_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return getEnvOrDefault("NEXT_PUBLIC_SUPABASE_ANON_KEY", DEFAULT_SUPABASE_ANON_KEY);
}

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}
