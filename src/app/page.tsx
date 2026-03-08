import type { Metadata } from "next";
import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { AppScreenshot } from "@/components/app-screenshot";
import { SiteFooter } from "@/components/site-footer";
import { AppStoreLinks } from "@/components/app-store-links";
import { PasswordResetDetector } from "@/components/password-reset-detector";

export const metadata: Metadata = {
  title: "Best Investment Ideas & Stock Picks | AI-Powered Portfolio Analysis | uncoverd",
  description:
    "Discover the best investment ideas and stock picks with AI-powered portfolio analysis. Get intelligent insights on the best stocks, build your portfolio, and track performance. AI in finance made accessible.",
  keywords: [
    "investment ideas",
    "best stocks",
    "portfolio",
    "AI in finance",
    "stock picks",
    "investment opportunities",
    "portfolio analysis",
    "AI stock recommendations",
  ],
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "uncoverd",
  applicationCategory: "FinanceApplication",
  operatingSystem: "iOS, Android",
  description:
    "AI-powered investment app for discovering the best stocks, investment ideas, and portfolio management. Get intelligent insights on stock picks and build your portfolio with AI in finance.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.5",
    ratingCount: "12",
  },
  featureList: [
    "AI-powered stock analysis",
    "Investment ideas discovery",
    "Portfolio management",
    "Best stock picks",
    "AI in finance insights",
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function checkAndRedirect() {
                // Check hash first (most common for Supabase redirects)
                const hash = window.location.hash.substring(1);
                if (hash) {
                  try {
                    const hashParams = new URLSearchParams(hash);
                    const accessToken = hashParams.get("access_token");
                    const hashType = hashParams.get("type");
                    
                    if (accessToken && hashType === "recovery") {
                      console.log("🔐 Password reset token detected in hash, redirecting to reset page...");
                      console.log("📍 Current URL:", window.location.href);
                      window.location.replace("/reset-password" + window.location.search + window.location.hash);
                      return true;
                    }
                  } catch (e) {
                    console.error("Error parsing hash:", e);
                  }
                }
                
                // Check URL parameters (from Supabase verify redirect)
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get("token");
                const type = urlParams.get("type");
                
                if (token && type === "recovery") {
                  console.log("🔐 Password reset token detected in URL, redirecting to verify...");
                  window.location.replace("/auth/verify?token=" + encodeURIComponent(token) + "&type=" + type);
                  return true;
                }
                
                return false;
              }
              
              // Run immediately
              if (checkAndRedirect()) {
                return;
              }
              
              // Also run on hashchange (in case hash is added after page load)
              window.addEventListener("hashchange", function() {
                checkAndRedirect();
              });
              
              // Run again after a short delay (in case hash is set asynchronously)
              setTimeout(function() {
                checkAndRedirect();
              }, 100);
            })();
          `,
        }}
      />
      <PasswordResetDetector />
      <MainNav />
      <main className="page">
        {/* Hero Section */}
        <section id="hero" className="hero">
          <p className="hero__eyebrow">Discover • Analyze • Invest</p>
          <h1>Investing, uncoverd.</h1>
          <p>
            Discover the best stocks and investment ideas with AI-powered portfolio analysis. Build your portfolio with
            intelligent insights on top stock picks, track performance, and make smarter investing decisions. AI in
            finance made simple.
          </p>
          <p>
            uncoverd transforms how you discover and evaluate investment opportunities. Swipe through the best stocks,
            get AI-powered analysis on each investment idea, and watch your portfolio grow with intelligent,
            data-driven insights.
          </p>

          <div className="hero__actions">
            <Link href="/login?next=%2Fpricing" className="btn">
              Get Started
            </Link>
            <Link href="#features" className="btn btn--ghost">
              See Features
            </Link>
          </div>

          <AppStoreLinks />
        </section>

        {/* App Showcase - Swipe & Portfolio */}
        <section id="app-showcase" className="story-section story-section--split">
          <div className="story-section__content">
            <p className="story-section__eyebrow">The App</p>
            <h2>Discover Best Stocks & Build Your Portfolio</h2>
            <div className="story-section__body">
              <p>
                Discover the best stocks and investment ideas the modern way. Swipe through top stock picks like you're
                browsing opportunities, not staring at spreadsheets. Each card shows you what matters: key points,
                risks, performance, and AI-powered insights.
              </p>
              <p>
                Build your portfolio naturally as you discover the best investment ideas. Track your holdings, monitor
                portfolio performance, and make decisions with confidence backed by intelligent analysis.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>Intuitive swipe interface for discovering the best stocks</li>
              <li>Build and manage your investment portfolio in real-time</li>
              <li>See key points and risks at a glance</li>
              <li>Track portfolio performance with beautiful visualizations</li>
            </ul>
            <Link href="/pricing" className="btn btn--ghost story-section__cta">
              Start Swiping
            </Link>
          </div>
          <AppScreenshot
            src="/screenshots/discover-swipe.PNG"
            alt="Best stocks and investment ideas discovery - AI-powered portfolio analysis interface"
          />
        </section>

        {/* AI-Powered Features */}
        <section id="ai-features" className="story-section story-section--split story-section--reverse">
          <div className="story-section__content">
            <p className="story-section__eyebrow">Powered by AI</p>
            <h2>AI in Finance: Intelligent Stock Analysis & Investment Ideas</h2>
            <div className="story-section__body">
              <p>
                Every stock pick, every investment idea, every portfolio insight is powered by advanced AI in finance.
                Get intelligent financial and market analysis, company insights, and portfolio summaries that help you
                identify the best stocks and investment opportunities.
              </p>
              <p>
                Our AI doesn't just give you data—it gives you understanding. Analyze market trends, evaluate company
                fundamentals, discover the best investment ideas, and get personalized portfolio insights tailored to
                your investment strategy.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>AI-powered financial and market analysis for best stocks</li>
              <li>Deep company insights and risk assessment on investment ideas</li>
              <li>Personalized portfolio summaries and analytics</li>
              <li>Intelligent stock recommendations based on your portfolio</li>
            </ul>
            <Link href="/pricing" className="btn btn--ghost story-section__cta">
              Explore AI Features
            </Link>
          </div>
          <AppScreenshot
            src="/screenshots/ai-insights.png"
            alt="AI in finance - intelligent stock analysis and investment ideas powered by artificial intelligence"
          />
        </section>

        {/* Competition & Rankings */}
        <section id="competition" className="story-section story-section--split">
          <div className="story-section__content">
            <p className="story-section__eyebrow">Compete & Rank</p>
            <h2>Compete against others to become the best investor.</h2>
            <div className="story-section__body">
              <p>
                See how you stack up against other investors. Climb the global rankings based on portfolio performance,
                win rate, and total returns. Compete to become the #1 investor.
              </p>
              <p>
                Track your rank, compare your performance, and see where you stand. The leaderboard updates in real-time
                as portfolios change and markets move.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>Global investor rankings and leaderboards</li>
              <li>Compare your performance against others</li>
              <li>Track your rank and climb to the top</li>
              <li>See top performers and learn from the best</li>
            </ul>
            <Link href="/pricing" className="btn btn--ghost story-section__cta">
              Join the Competition
            </Link>
          </div>
          <AppScreenshot
            src="/screenshots/rankings.png"
            alt="Portfolio performance rankings - compare your investment portfolio against other investors"
          />
        </section>

        {/* Performance Tracking */}
        <section id="performance" className="story-section story-section--split story-section--reverse">
          <div className="story-section__content">
            <p className="story-section__eyebrow">Track & Analyze</p>
            <h2>Track your performance and discover your investor profile.</h2>
            <div className="story-section__body">
              <p>
                Understand your investing style. See how your portfolio performs over time, compare it to market averages,
                and discover your unique investor profile.
              </p>
              <p>
                Get detailed analytics on your trading patterns, portfolio composition, and performance metrics. Learn
                what kind of investor you are and how to improve.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>Track portfolio performance over time</li>
              <li>Compare your returns against market averages</li>
              <li>Discover your unique investor profile</li>
              <li>Analyze your trading style and patterns</li>
            </ul>
            <Link href="/pricing" className="btn btn--ghost story-section__cta">
              View Your Profile
            </Link>
          </div>
          <AppScreenshot
            src="/screenshots/performance.png"
            alt="Portfolio performance tracking - AI-powered analytics for investment portfolio management"
          />
        </section>

        {/* Crowd Wisdom Top Picks */}
        <section id="top-picks" className="story-section story-section--split">
          <div className="story-section__content">
            <p className="story-section__eyebrow">Crowd Wisdom</p>
            <h2>Best Stock Picks & Investment Ideas from Crowd Wisdom</h2>
            <div className="story-section__body">
              <p>
                See what the community is discovering. Get the best stock picks and investment ideas curated from
                thousands of investors swiping, analyzing, and building portfolios.
              </p>
              <p>
                Crowd wisdom surfaces the best investment opportunities. When many investors discover and like a stock,
                it appears in Top Picks—your shortcut to the most promising investment ideas and best stocks for your
                portfolio.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>Best stock picks based on community discovery</li>
              <li>See top investment ideas other investors are finding</li>
              <li>Get curated stock recommendations from crowd wisdom</li>
              <li>Discover trending stocks and investment opportunities for your portfolio</li>
            </ul>
            <Link href="/pricing" className="btn btn--ghost story-section__cta">
              See Top Picks
            </Link>
          </div>
          <AppScreenshot
            src="/screenshots/top-picks.png"
            alt="Best stock picks and investment ideas - top picks curated from crowd wisdom and AI analysis"
          />
        </section>

        {/* Final CTA */}
        <section className="story-section story-section--final">
          <h2>Start Discovering the Best Investment Ideas Today</h2>
          <div className="story-section__body">
            <p>
              Join uncoverd and discover a better way to invest. Find the best stocks and investment ideas, build your
              portfolio with AI-powered insights, compete with others, and track your portfolio performance—all in one
              beautiful app powered by AI in finance.
            </p>
            <p>
              Get started with the best stock picks, intelligent portfolio analysis, and AI-powered investment ideas.
              Investing doesn't have to be complicated.
            </p>
          </div>

          <div className="hero__actions">
            <Link href="/login?next=%2Fpricing" className="btn">
              Get Started
            </Link>
            <Link href="/pricing" className="btn btn--ghost">
              View Plans
            </Link>
          </div>

          <p className="story-section__closing">uncoverd — discover with clarity. invest with conviction.</p>
        </section>

        <p className="brand-footer">
          uncoverd is building a new kind of investing experience centered on discovery, clarity, and conviction.
          Designed for a generation that wants better tools, not more noise.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
