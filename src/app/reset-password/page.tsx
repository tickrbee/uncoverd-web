import type { Metadata } from "next";
import { MainNav } from "@/components/main-nav";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password | uncoverd",
  description: "Reset your uncoverd account password",
};

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

