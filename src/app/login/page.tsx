import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <LoginForm />
        <p style={{ textAlign: "center", marginTop: "14px" }}>
          By continuing, you agree to our <Link href="/legal/terms">Terms</Link> and{" "}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </main>
    </>
  );
}
