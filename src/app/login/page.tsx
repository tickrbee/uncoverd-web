import { redirect } from "next/navigation";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already logged in → send home (keep people in the product, not on /account)
  if (user) {
    redirect("/");
  }

  return (
    <>
      <MainNav />
      <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
        <LoginForm />
        <p style={{
          marginTop: "0.5rem",
          paddingBottom: "1.5rem",
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
