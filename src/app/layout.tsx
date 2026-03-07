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
  title: `${APP_NAME} | AI-Powered Investment Ideas & Best Stocks Portfolio`,
  description:
    "Discover the best stocks and investment ideas with AI-powered portfolio analysis. Build your portfolio with intelligent insights, track performance, and compete with other investors. AI in finance made simple.",
  keywords: [
    "investment ideas",
    "best stocks",
    "portfolio",
    "AI in finance",
    "stock analysis",
    "investment app",
    "portfolio management",
    "AI stock recommendations",
    "investment opportunities",
    "stock picks",
    "financial AI",
    "investment platform",
  ],
  openGraph: {
    title: `${APP_NAME} | AI-Powered Investment Ideas & Best Stocks Portfolio`,
    description:
      "Discover the best stocks and investment ideas with AI-powered portfolio analysis. Build your portfolio with intelligent insights and track performance.",
    type: "website",
    url: "https://uncoverd.org",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | AI-Powered Investment Ideas & Best Stocks Portfolio`,
    description:
      "Discover the best stocks and investment ideas with AI-powered portfolio analysis. Build your portfolio with intelligent insights.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var h = window.location.hash.substring(1);
                if (!h) return;
                var p = new URLSearchParams(h);
                if (p.get("access_token") && p.get("type") === "recovery") {
                  window.location.replace("/reset-password" + window.location.search + window.location.hash);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>{children}</body>
    </html>
  );
}
