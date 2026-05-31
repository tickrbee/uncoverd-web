import type { Metadata } from "next";
import { Suspense } from "react";
import { MainNav } from "@/components/main-nav";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your uncoverd account password",
  robots: { index: false, follow: true },
};

export default function ResetPasswordPage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </>
  );
}

