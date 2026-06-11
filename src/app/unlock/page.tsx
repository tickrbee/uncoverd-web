import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UnlockView } from "@/components/unlock-view";

export const metadata: Metadata = {
  title: "Get This Month's Top-Rated Dividend Stock — uncoverd",
  description:
    "Enter your email to get access to uncoverd's top-rated dividend stocks this month — the #1 pick plus the full A–F ranking.",
  alternates: { canonical: "/unlock" },
  robots: { index: false, follow: true },
};

export default function UnlockPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <UnlockView />
      </main>
      <SiteFooter />
    </>
  );
}
