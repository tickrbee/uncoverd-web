import { MainNav } from "@/components/main-nav";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <ResetPasswordForm />
      </main>
    </>
  );
}

