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
      <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <SignupForm />
        <p style={{ 
          marginTop: "auto",
          paddingBottom: "1rem",
          textAlign: "center", 
          fontSize: "0.875rem",
          color: "var(--text-secondary)",
          zIndex: 20,
          position: "relative"
        }}>
          By continuing, you agree to our <Link href="/legal/terms" style={{ color: "#60a5fa" }}>Terms</Link> and{" "}
          <Link href="/legal/privacy" style={{ color: "#60a5fa" }}>Privacy Policy</Link>.
        </p>
      </div>
    </>
  );
}

