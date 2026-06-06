import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { APP_NAME } from "@/lib/branding";
import { SessionRestorer } from "@/components/session-restorer";
import { CookieBanner } from "@/components/cookie-banner";
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
    // Front-loaded with the dividend keywords because Google weights the
    // first words of the title heavily. The old title led with "AI-Powered"
    // which made the snippet read as a generic AI/portfolio tool rather
    // than a dividend research platform — the search result on uncoverd.org
    // was getting filed next to robo-advisors instead of dividend.com.
    default: `${APP_NAME} — Dividend Stock Research, Ratings & ETF Screener`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Dividend stock research platform. Screen 65,000+ stocks and 13,800+ dividend ETFs by yield, payout ratio, growth and rating. Ex-dividend calendar, model portfolios, and ETF comparison tools — built on SEC filings.",
  keywords: [
    "dividend stocks",
    "dividend stock screener",
    "dividend ETF screener",
    "best dividend stocks",
    "high yield dividend stocks",
    "monthly dividend stocks",
    "dividend aristocrats",
    "dividend kings",
    "ex-dividend calendar",
    "dividend yield",
    "dividend growth",
    "REIT dividends",
    "dividend portfolio",
    "dividend research",
    "SCHD VYM JEPI",
  ],
  // NOTE: we intentionally do NOT set a global `alternates.canonical` here.
  // A canonical defined in the root layout is inherited by every page that
  // doesn't override it, which made dozens of pages (methodology, legal/*,
  // about, sectors, news…) declare the homepage as their canonical — telling
  // Google they were duplicates of "/". Each page now sets its own
  // self-referential canonical instead. The homepage's lives in app/page.tsx.
  openGraph: {
    // NO `url` here on purpose: a site-wide og:url is inherited by every page
    // that doesn't override it, making og:url = the homepage on 5k+ pages
    // (Ahrefs "Open Graph URL not matching canonical"). Pages that want og:url
    // set it themselves (= their canonical); the rest simply omit it.
    title: `${APP_NAME} — Dividend Stock Research, Ratings & ETF Screener`,
    description:
      "Screen 65,000+ dividend stocks and 13,800+ ETFs by yield, payout ratio, and rating. Ex-dividend calendar, model portfolios, and ETF comparison tools.",
    type: "website",
    siteName: APP_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Dividend Stock Research, Ratings & ETF Screener`,
    description:
      "Screen 65,000+ dividend stocks and 13,800+ ETFs by yield, payout ratio, and rating. Ex-dividend calendar + ETF compare.",
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
        {/* Plausible: privacy-friendly analytics. Runs alongside Vercel
            Analytics — different value props (Plausible: referrer paths,
            Vercel: speed insights). Both fire client-side. */}
        <script
          defer
          src="https://plausible.io/js/pa-j2Xmu77enuEkN6zc52GXo.js"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`,
          }}
        />
        {/* Vercel Web Analytics + Speed Insights — hand-rendered like Plausible
            above, on purpose. The @vercel/analytics <Analytics/> component
            (v2.0.1, the latest stable) does NOT inject its next/script under
            Next 16 / React 19, so no beacon ever fired (Vercel support confirmed
            no /view request). Web Analytics IS enabled — both scripts are served
            200 at these canonical paths — so we load them directly, which is
            Vercel's documented manual integration. A plain <script> in <head>
            renders into the HTML reliably (Plausible proves it), unlike the
            component. DO NOT revert to <Analytics/>/<SpeedInsights/> until the
            package supports Next 16. */}
        <script defer src="/_vercel/insights/script.js" />
        <script defer src="/_vercel/speed-insights/script.js" />
        {/* Ahrefs Web Analytics — hand-rendered in <head> like the scripts
            above. Tracks traffic/Core Web Vitals for the Ahrefs dashboard. */}
        <script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="2PvDfKV06I6B3bTrWXslJg"
          async
        />
      </head>
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <div className="global-background-effect">
          <div className="global-bg-blur global-bg-blur--1"></div>
          <div className="global-bg-blur global-bg-blur--2"></div>
        </div>
        <SessionRestorer />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
