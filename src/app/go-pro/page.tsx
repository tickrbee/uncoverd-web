import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GoProClient } from "@/components/go-pro-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout — uncoverd",
  robots: { index: false, follow: false },
};

export default async function GoProPage() {
  // Server-authoritative: read who's signed in from the cookie session so the
  // page never loops on flaky client-side session detection (incl. after OAuth).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <GoProClient signedInEmail={user?.email ?? null} />;
}
