import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { AppScreenshot } from "@/components/app-screenshot";
import { SiteFooter } from "@/components/site-footer";
import { AppStoreLinks } from "@/components/app-store-links";

export default function HomePage() {
  return (
    <>
      <MainNav />
      <main className="page">
        {/* Hero Section */}
        <section id="hero" className="hero">
          <p className="hero__eyebrow">Discover • Analyze • Invest</p>
          <h1>Investing, uncoverd.</h1>
          <p>
            Swipe through stocks, build your portfolio, and get AI-powered insights to make smarter investing decisions.
            All in one elegant mobile app.
          </p>
          <p>
            uncoverd transforms how you discover and evaluate investment opportunities. Swipe right on stocks you like,
            swipe left to pass, and watch your portfolio grow with intelligent, AI-driven analysis.
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
            <h2>Swipe stocks. Build your portfolio.</h2>
            <div className="story-section__body">
              <p>
                Discover stocks the modern way. Swipe through companies like you're browsing opportunities, not staring at
                spreadsheets. Each card shows you what matters: key points, risks, performance, and insights.
              </p>
              <p>
                Build your portfolio naturally as you discover companies you believe in. Track your holdings, monitor
                performance, and make decisions with confidence.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>Intuitive swipe interface for discovering stocks</li>
              <li>Build and manage your portfolio in real-time</li>
              <li>See key points and risks at a glance</li>
              <li>Track performance with beautiful visualizations</li>
            </ul>
            <Link href="/pricing" className="btn btn--ghost story-section__cta">
              Start Swiping
            </Link>
          </div>
          <AppScreenshot
            src="/screenshots/discover-swipe.PNG"
            alt="uncoverd app showing stock discovery interface with swipe cards"
          />
        </section>

        {/* AI-Powered Features */}
        <section id="ai-features" className="story-section story-section--split story-section--reverse">
          <div className="story-section__content">
            <p className="story-section__eyebrow">Powered by AI</p>
            <h2>Get intelligent analysis and insights.</h2>
            <div className="story-section__body">
              <p>
                Every stock, every insight, every summary is powered by advanced AI. Get financial and market analysis,
                company insights, and portfolio summaries that help you understand what you're investing in.
              </p>
              <p>
                Our AI doesn't just give you data—it gives you understanding. Analyze market trends, evaluate company
                fundamentals, and get personalized insights tailored to your portfolio.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>AI-powered financial and market analysis</li>
              <li>Deep company insights and risk assessment</li>
              <li>Personalized portfolio summaries</li>
              <li>Intelligent recommendations based on your preferences</li>
            </ul>
            <Link href="/pricing" className="btn btn--ghost story-section__cta">
              Explore AI Features
            </Link>
          </div>
          <AppScreenshot
            src="/screenshots/ai-insights.png"
            alt="uncoverd app showing AI-powered company insights and analysis"
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
            alt="uncoverd app showing global investor rankings and leaderboard"
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
            alt="uncoverd app showing performance tracking and investor profile analytics"
          />
        </section>

        {/* Crowd Wisdom Top Picks */}
        <section id="top-picks" className="story-section story-section--split">
          <div className="story-section__content">
            <p className="story-section__eyebrow">Crowd Wisdom</p>
            <h2>Get top stock picks based on crowd wisdom.</h2>
            <div className="story-section__body">
              <p>
                See what the community is discovering. Get top stock picks curated from thousands of investors swiping,
                analyzing, and building portfolios.
              </p>
              <p>
                Crowd wisdom surfaces the best opportunities. When many investors discover and like a stock, it appears in
                Top Picks—your shortcut to the most promising opportunities.
              </p>
            </div>
            <ul className="story-section__bullets">
              <li>Top picks based on community discovery</li>
              <li>See what other investors are finding</li>
              <li>Get curated recommendations from crowd wisdom</li>
              <li>Discover trending stocks and opportunities</li>
            </ul>
            <Link href="/pricing" className="btn btn--ghost story-section__cta">
              See Top Picks
            </Link>
          </div>
          <AppScreenshot
            src="/screenshots/top-picks.png"
            alt="uncoverd app showing top stock picks based on crowd wisdom"
          />
        </section>

        {/* Final CTA */}
        <section className="story-section story-section--final">
          <h2>Start your investing journey today.</h2>
          <div className="story-section__body">
            <p>
              Join uncoverd and discover a better way to invest. Swipe stocks, build your portfolio, get AI insights,
              compete with others, and track your performance—all in one beautiful app.
            </p>
            <p>Investing doesn't have to be complicated. It can be clear, intelligent, and even fun.</p>
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
