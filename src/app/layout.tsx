import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { APP_NAME } from "@/lib/branding";
import { SessionRestorer } from "@/components/session-restorer";
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
  metadataBase: new URL("https://uncoverd.org"),
  title: {
    default: `${APP_NAME} | AI-Powered Investment Ideas & Best Stocks Portfolio`,
    template: `%s | ${APP_NAME}`,
  },
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${APP_NAME} | AI-Powered Investment Ideas & Best Stocks Portfolio`,
    description:
      "Discover the best stocks and investment ideas with AI-powered portfolio analysis. Build your portfolio with intelligent insights and track performance.",
    type: "website",
    url: "https://uncoverd.org",
    siteName: APP_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | AI-Powered Investment Ideas & Best Stocks Portfolio`,
    description:
      "Discover the best stocks and investment ideas with AI-powered portfolio analysis. Build your portfolio with intelligent insights.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <div className="global-background-effect">
          <div className="global-bg-blur global-bg-blur--1"></div>
          <div className="global-bg-blur global-bg-blur--2"></div>
        </div>
        <SessionRestorer />
        {children}
      </body>
    </html>
  );
}
