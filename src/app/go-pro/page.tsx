import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SessionRestorer } from "@/components/session-restorer";
import { GoProClient } from "@/components/go-pro-client";

export const metadata: Metadata = {
  title: "Get Pro — uncoverd",
  robots: { index: false, follow: false },
};

export default function GoProPage() {
  return (
    <>
      <SessionRestorer />
      <SiteHeader />
      <GoProClient />
      <SiteFooter />
    </>
  );
}
