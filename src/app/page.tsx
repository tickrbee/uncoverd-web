import Link from "next/link";
import { MainNav } from "@/components/main-nav";

type StorySection = {
  id: string;
  eyebrow: string;
  headline: string;
  body: string[];
  bullets?: string[];
  ctaLine?: string;
  ctaLabel?: string;
  ctaHref?: string;
  emphasis?: string;
};

const storySections: StorySection[] = [
  {
    id: "problem",
    eyebrow: "The problem",
    headline: "Modern investing feels broken.",
    body: [
      "What should be an act of curiosity, judgment, and conviction has turned into something else: an exhausting stream of hot takes, endless dashboards, breaking news, shallow commentary, and products designed to keep users active rather than thoughtful.",
      "People are not excluded from investing because they are incapable of learning. They are excluded because the experience has been designed badly.",
      "It is cluttered when it should be clear. Intimidating when it should be empowering. Reactive when it should be reflective.",
      "The result is a generation of users with more access than ever before and less clarity than ever before.",
    ],
    ctaLine: "There is a better way. uncoverd is built to make investing feel intelligible again.",
    ctaLabel: "Learn more",
    ctaHref: "#core-idea",
  },
  {
    id: "core-idea",
    eyebrow: "Why uncoverd exists",
    headline: "Discovery comes before decision.",
    body: [
      "Before anyone can build a portfolio, they first need to encounter ideas in the right way.",
      "Not as a spreadsheet. Not as a wall of tickers. Not as a terminal built only for insiders. Not as a social feed optimized for distraction.",
      "Most people begin investing with fragments: a company they vaguely know, a sector they are curious about, a trend they keep hearing about, or an intuition they cannot yet articulate.",
      "That early stage matters. It is where curiosity either becomes conviction or collapses into confusion.",
      "uncoverd is designed around that moment. We help users discover companies and opportunities in a way that feels natural, focused, and intelligent.",
    ],
    bullets: [
      "Discover opportunities with clarity",
      "Understand what you are looking at",
      "Build conviction before taking action",
    ],
    ctaLabel: "Start discovering",
    ctaHref: "/pricing",
  },
  {
    id: "philosophy",
    eyebrow: "Our philosophy",
    headline: "We are not building another finance app.",
    body: [
      "We are building a better interface for thinking.",
      "At uncoverd, we believe the future of investing is not just more data. It is better judgment.",
      "That means creating a product that helps users focus attention, understand businesses more clearly, distinguish signal from noise, build coherent investment views, and act with more intention.",
      "We do not believe in overwhelming people to make a product look powerful. We believe true sophistication often looks like clarity.",
    ],
    emphasis: "Simplicity is not the absence of intelligence. It is intelligence made usable.",
  },
  {
    id: "attention",
    eyebrow: "Attention matters",
    headline: "The best investing decisions begin with focus.",
    body: [
      "In finance, everyone talks about capital. Far fewer people talk about attention. But attention is where every portfolio begins.",
      "What users notice shapes what they study. What they study shapes what they understand. What they understand shapes what they own.",
      "Most financial products compete to fragment attention with noise, urgency, and constant stimulation. uncoverd is designed to do the opposite.",
      "We help users focus on what deserves consideration, not just what is loudest.",
    ],
    bullets: ["Less noise", "Better framing", "Clearer choices", "More thoughtful decisions"],
    ctaLabel: "See the difference",
    ctaHref: "/pricing",
  },
  {
    id: "conviction",
    eyebrow: "Built for conviction",
    headline: "Activity is not the same as progress.",
    body: [
      "The financial world often rewards motion: buy, sell, rotate, react, refresh.",
      "But constant activity is rarely a sign of real understanding. More often, it is a sign of uncertainty.",
      "uncoverd is built around a different principle: helping users move from scattered interest to focused curiosity, from curiosity to understanding, and from understanding to conviction.",
      "Because when someone truly understands why they own something, they make better decisions. They are less likely to chase noise, panic, or imitate others without understanding the reasoning.",
    ],
    emphasis: "Conviction is not certainty. It is the ability to say: I understand what I own, and I know why I own it.",
    ctaLabel: "Build with intention",
    ctaHref: "/pricing",
  },
  {
    id: "education",
    eyebrow: "Learning by doing",
    headline: "Education should be part of the product, not separate from it.",
    body: [
      "Most financial education fails because it is disconnected from real decisions.",
      "People read generic articles, abstract lessons, and endless explanations, then feel lost again when they face an actual investment choice.",
      "We believe learning works better in context, at the exact moment curiosity appears: when comparing companies, evaluating risks, or deciding whether an idea belongs in a portfolio.",
      "At uncoverd, education is not a side feature. It is embedded into the experience.",
    ],
    bullets: ["Learn in context", "Understand faster", "Improve judgment over time"],
    ctaLabel: "Learn while you invest",
    ctaHref: "/pricing",
  },
  {
    id: "different",
    eyebrow: "Why it feels different",
    headline: "A product designed for clarity, not overload.",
    body: [
      "Every product teaches users how to behave.",
      "Some platforms teach compulsion. Some teach passivity. Some teach performance.",
      "We want uncoverd to teach curiosity over conformity, understanding over impulse, focus over fragmentation, depth over superficiality, and long-term thinking over performative urgency.",
      "This is not just a design decision. It is a product philosophy. We believe technology should expand judgment, not replace it.",
    ],
    ctaLine:
      "For thoughtful investors. For curious beginners. For anyone who wants a better entry point into the market.",
    ctaLabel: "Join uncoverd",
    ctaHref: "/login?next=%2Fpricing",
  },
  {
    id: "name",
    eyebrow: "Why uncoverd",
    headline: "Because good investing starts when something becomes visible.",
    body: [
      "To uncover is to reveal what is hidden. To bring clarity to what once felt opaque. To make something intelligible that was buried beneath noise.",
      "That is what we want this product to do: uncover opportunities worth understanding, uncover the narratives behind companies, uncover the assumptions behind decisions, and uncover the difference between signal and distraction.",
      "Ultimately, we want to help users uncover their own judgment.",
    ],
    ctaLabel: "Discover what matters",
    ctaHref: "/pricing",
  },
  {
    id: "who-for",
    eyebrow: "Who we build for",
    headline: "For people who want more than hype.",
    body: [
      "uncoverd is built for people who want to engage with markets in a more thoughtful way.",
      "For the ambitious beginner. For the curious learner. For the investor in formation. For people who sense there must be a better way than endless noise and overwhelming complexity.",
    ],
    bullets: [
      "A clearer starting point",
      "A more elegant investing experience",
      "Better tools for forming judgment",
      "Less chaos and more conviction",
    ],
    ctaLabel: "Get early access",
    ctaHref: "/login?next=%2Fpricing",
  },
];

export default function HomePage() {
  return (
    <>
      <MainNav />
      <main className="page">
        <section className="hero">
          <p className="hero__eyebrow">Hero Section</p>
          <h1>Investing, uncoverd.</h1>
          <p>
            A new way to discover stocks, build conviction, and make better investing decisions without the noise,
            clutter, and chaos of traditional finance products.
          </p>
          <p>
            Most investing platforms overwhelm people with information, pressure, and complexity. uncoverd is built
            differently. We believe investing should begin with discovery, not confusion. With curiosity, not anxiety.
            With clear thinking, not noise.
          </p>
          <p>
            uncoverd helps users explore opportunities, understand what matters, and build portfolios with greater
            focus and intention.
          </p>

          <div className="hero__actions">
            <Link href="/login?next=%2Fpricing" className="btn">
              Join the waitlist
            </Link>
            <Link href="#core-idea" className="btn btn--ghost">
              See how it works
            </Link>
          </div>
        </section>

        <div className="story-grid">
          {storySections.map((section) => (
            <section key={section.id} id={section.id} className="story-section">
              <p className="story-section__eyebrow">{section.eyebrow}</p>
              <h2>{section.headline}</h2>

              <div className="story-section__body">
                {section.body.map((paragraph, index) => (
                  <p key={`${section.id}-p-${index}`}>{paragraph}</p>
                ))}
              </div>

              {section.bullets ? (
                <ul className="story-section__bullets">
                  {section.bullets.map((bullet, index) => (
                    <li key={`${section.id}-b-${index}`}>{bullet}</li>
                  ))}
                </ul>
              ) : null}

              {section.emphasis ? <blockquote className="story-section__quote">{section.emphasis}</blockquote> : null}

              {section.ctaLine ? <p className="story-section__cta-line">{section.ctaLine}</p> : null}

              {section.ctaLabel && section.ctaHref ? (
                <Link href={section.ctaHref} className="btn btn--ghost story-section__cta">
                  {section.ctaLabel}
                </Link>
              ) : null}
            </section>
          ))}
        </div>

        <section className="story-section feature-strip">
          <h2>What uncoverd helps you do</h2>
          <ul className="story-section__bullets">
            <li>Discover intelligently: Explore companies and opportunities in a more focused way.</li>
            <li>Understand clearly: Get context that helps you evaluate what actually matters.</li>
            <li>Build conviction: Move from curiosity to confident, intentional decisions.</li>
            <li>Invest thoughtfully: Create a more coherent relationship with the market.</li>
          </ul>
        </section>

        <section className="story-section story-section--final">
          <h2>A better investing experience starts here.</h2>
          <div className="story-section__body">
            <p>Investing does not have to feel intimidating, chaotic, or shallow.</p>
            <p>
              It can be clear. It can be thoughtful. It can be elegant. It can help people become more capable over
              time.
            </p>
            <p>That is what uncoverd is built to do.</p>
          </div>

          <div className="hero__actions">
            <Link href="/login?next=%2Fpricing" className="btn">
              Join the waitlist
            </Link>
            <a href="mailto:hello@uncoverd.org" className="btn btn--ghost">
              Contact us
            </a>
          </div>

          <p className="story-section__closing">uncoverd — discover with clarity. invest with conviction.</p>
        </section>

        <p className="brand-footer">
          uncoverd is building a new kind of investing experience centered on discovery, clarity, and conviction.
          Designed for a generation that wants better tools, not more noise.
        </p>
      </main>
    </>
  );
}
