import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import { APP_NAME } from "@/lib/branding";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: `${APP_NAME} | Subscription Billing`,
  description: "uncoverd subscription login, checkout, and billing portal for the mobile app.",
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
