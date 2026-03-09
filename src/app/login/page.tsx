import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
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
      <LoginForm />
      <p style={{ 
        position: "fixed", 
        bottom: "1rem", 
        left: "50%", 
        transform: "translateX(-50%)",
        textAlign: "center", 
        fontSize: "0.875rem",
        color: "var(--text-secondary)",
        zIndex: 20
      }}>
        By continuing, you agree to our <Link href="/legal/terms" style={{ color: "#60a5fa" }}>Terms</Link> and{" "}
        <Link href="/legal/privacy" style={{ color: "#60a5fa" }}>Privacy Policy</Link>.
      </p>
    </>
  );
}
