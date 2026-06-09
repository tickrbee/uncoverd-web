import type { Metadata } from "next";
import { SessionRestorer } from "@/components/session-restorer";
import { GoProClient } from "@/components/go-pro-client";

export const metadata: Metadata = {
  title: "Checkout — uncoverd",
  robots: { index: false, follow: false },
};

export default function GoProPage() {
  return (
    <>
      <SessionRestorer />
      <GoProClient />
    </>
  );
}
