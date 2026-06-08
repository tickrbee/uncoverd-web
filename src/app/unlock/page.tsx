import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UnlockForm } from "@/components/unlock-form";

export const metadata: Metadata = {
  title: "Get This Month's Top-Rated Dividend Stock — uncoverd",
  description:
    "Enter your email to get access to uncoverd's top-rated dividend stocks this month — the #1 pick plus the full A–F ranking.",
  alternates: { canonical: "/unlock" },
  robots: { index: false, follow: true },
};

const ACCENT = "#15b87f";

export default function UnlockPage() {
  return (
    <>
      <SiteHeader />
      <main className="dv-page">
        <section className="dv-section" style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", paddingTop: 16 }}>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: ACCENT, marginBottom: 14 }}>
            Free access
          </div>
          <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 14px", lineHeight: 1.12 }}>
            Get this month's top-rated dividend stocks
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.02rem", lineHeight: 1.6, margin: "0 auto 26px", maxWidth: 480 }}>
            Drop your email and we&apos;ll take you straight to this month&apos;s #1-rated pick and the full A–F ranking — chosen by our 5-pillar model, not hand-picked.
          </p>
          <UnlockForm />
          <div style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 28 }}>
            <span>✓ 65,000+ stocks rated A–F</span>
            <span>✓ Updated continuously</span>
            <span>✓ No spam</span>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
