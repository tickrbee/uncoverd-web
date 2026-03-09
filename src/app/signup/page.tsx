import { redirect } from "next/navigation";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { SignupForm } from "@/components/signup-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to account page if already logged in
  if (user) {
    redirect("/account");
  }

  return (
    <>
      <MainNav />
      <main className="page">
        <SignupForm />
        <p style={{ textAlign: "center", marginTop: "14px" }}>
          By continuing, you agree to our <Link href="/legal/terms">Terms</Link> and{" "}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </main>
    </>
  );
}

