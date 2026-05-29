"use server";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBackendClient } from "@/lib/supabase/admin";

// Server action for the inbox status buttons. Re-authenticates inside
// the action — server actions are public endpoints, so the auth check
// inside the page DOES NOT protect the action by itself.

export async function updateOpportunityStatus(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/inbox");

  if (!Number.isFinite(id)) throw new Error("invalid id");
  if (!["new", "seen", "actioned", "dismissed"].includes(status)) {
    throw new Error("invalid status");
  }

  // Re-check operator email — never trust the page-side gate alone.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const operatorEmail = process.env.OPERATOR_EMAIL;
  if (!user || !operatorEmail || user.email !== operatorEmail) {
    notFound();
  }

  const sb = getBackendClient();
  const { error } = await sb
    .schema("public")
    .from("reddit_opportunities")
    .update({
      status,
      actioned_at: status === "actioned" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(`status update failed: ${error.message}`);

  redirect(redirectTo);
}
