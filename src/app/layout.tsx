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
  title: `${APP_NAME} | Landing, Login, and Billing`,
  description: "uncoverd official site for onboarding, login, and subscription management.",
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
