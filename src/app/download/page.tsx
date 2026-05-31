import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { AppScreenshot } from "@/components/app-screenshot";
import { SiteFooter } from "@/components/site-footer";
import { AppStoreLinks } from "@/components/app-store-links";

export const metadata: Metadata = {
  title: "Download the Mobile App",
  description:
    "Download uncoverd — the AI-powered investing app for discovering the best stocks, building your portfolio, and competing with other investors.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <section id="hero" className="hero">
          <p className="hero__eyebrow">The uncoverd Mobile App</p>
          <h1>Investing, uncoverd.</h1>
          <p>
            Discover the best stocks and investment ideas with AI-powered portfolio analysis. Build your portfolio with
            intelligent insights on top stock picks, track performance, and compete with other investors.
          </p>

          <div className="hero__actions">
            <Link href="/signup" className="btn">
              Get Started
            </Link>
            <Link href="#features" className="btn btn--ghost">
              See Features
            </Link>
          </div>

          <AppStoreLinks />
        </section>

        <section id="features" className="story-section story-section--split">
          <div className="story-section__content">
            <p className="story-section__eyebrow">The App</p>
            <h2>Discover Best Stocks &amp; Build Your Portfolio</h2>
            <div className="story-section__body">
              <p>
                Swipe through top stock picks like you&apos;re browsing opportunities, not staring at spreadsheets. Each
                card shows you what matters: key points, risks, performance, and AI-powered insights.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>Intuitive swipe interface for discovering the best stocks</li>
              <li>Build and manage your investment portfolio in real-time</li>
              <li>See key points and risks at a glance</li>
              <li>Track portfolio performance with beautiful visualizations</li>
            </ul>
          </div>
          <AppScreenshot src="/screenshots/discover-swipe.PNG" alt="Stock discovery swipe interface" />
        </section>

        <section className="story-section story-section--split story-section--reverse">
          <div className="story-section__content">
            <p className="story-section__eyebrow">Powered by AI</p>
            <h2>AI-Powered Stock Analysis</h2>
            <div className="story-section__body">
              <p>
                Every stock pick, every investment idea, every portfolio insight is powered by advanced AI. Get
                intelligent market analysis, company insights, and portfolio summaries.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>AI-powered financial and market analysis</li>
              <li>Deep company insights and risk assessment</li>
              <li>Personalized portfolio summaries and analytics</li>
            </ul>
          </div>
          <AppScreenshot src="/screenshots/ai-insights.png" alt="AI-powered stock analysis" />
        </section>

        <section className="story-section story-section--final">
          <h2>Get the App Today</h2>
          <div className="story-section__body">
            <p>Available now on iOS and Android. Free to start, premium features available.</p>
          </div>
          <AppStoreLinks />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
