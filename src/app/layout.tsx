import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { APP_NAME } from "@/lib/branding";
import "./globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: `${APP_NAME} | Subscription Billing`,
  description: "uncoverd subscription login, checkout, and billing portal for the mobile investing app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>{children}</body>
    </html>
  );
}
