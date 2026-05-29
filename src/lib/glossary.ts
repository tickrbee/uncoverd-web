// Canonical dividend-investing glossary. Each entry powers a programmatic
// `/glossary/[slug]` SEO page + the index at `/glossary`. Definitions are
// written in the Q&A pattern AI engines prefer.

export type GlossaryEntry = {
  slug: string;
  term: string;
  short: string;
  body: string;
  examples?: string[];
  relatedSlugs?: string[];
  faq?: { q: string; a: string }[];
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    slug: "dividend-yield",
    term: "Dividend Yield",
    short:
      "A stock's annual dividend per share divided by its current price, expressed as a percentage.",
    body: "Dividend yield tells you what cash return you'd earn from dividends alone if you bought the stock today and the dividend stayed constant. It's calculated as forward annual dividend ÷ share price × 100. A 3% yield means a $100 stock pays $3 in dividends per year. Yield moves inversely with price — if the share price falls 10% and the dividend stays the same, the yield rises proportionally. High yields can signal value or risk; very high yields often warn of an imminent dividend cut.",
    examples: [
      "Coca-Cola (KO) trading at $60 with an annual dividend of $1.80 has a yield of 3.0%.",
      "A REIT yielding 12% with falling FFO is usually pricing in a dividend cut.",
    ],
    relatedSlugs: ["forward-dividend", "payout-ratio", "yield-trap"],
    faq: [
      {
        q: "What is a good dividend yield?",
        a: "There's no universal answer. For large-cap dividend payers, 2-4% is typical. Anything materially above the sector median (e.g. an 8% yield in a 3% sector) should trigger scrutiny — yield that high usually reflects price decline rather than dividend growth.",
      },
      {
        q: "Is dividend yield the same as return?",
        a: "No. Yield is just the dividend cash component. Total return = dividend yield + capital appreciation. A 4% yielder that loses 6% in price has a -2% total return for the year.",
      },
    ],
  },
  {
    slug: "ex-dividend-date",
    term: "Ex-Dividend Date",
    short:
      "The first trading day a stock trades without the right to its next declared dividend.",
    body: "To receive a declared dividend, you must own the stock before the ex-dividend date (also called the ex-date). Buy on or after that date and the seller keeps the dividend. The stock price typically opens lower on the ex-date by approximately the dividend amount, which is why short-term dividend-capture strategies aren't free money. The sequence: declaration date → ex-date → record date → payment date.",
    examples: [
      "If a stock's ex-dividend date is May 15, you must own it by close on May 14 to receive the dividend.",
      "A $0.50 dividend typically causes the stock to drop ~$0.50 at the open on its ex-date.",
    ],
    relatedSlugs: ["record-date", "payment-date", "dividend-capture"],
    faq: [
      {
        q: "Can I buy a stock on the ex-dividend date and still get the dividend?",
        a: "No. The ex-date is the first day shares trade without the dividend. You must own shares the day before the ex-date.",
      },
    ],
  },
  {
    slug: "payout-ratio",
    term: "Payout Ratio",
    short:
      "The fraction of earnings (or free cash flow) a company distributes as dividends.",
    body: "Payout ratio = dividends paid ÷ net income (or free cash flow). It measures how comfortably a company can sustain its dividend. Under 50% is typical for growing companies that reinvest. 60-80% is normal for mature utilities and REITs. Above 100% is a red flag — the company is paying out more than it earns and is funding dividends from debt or asset sales. REIT payout ratios should be computed against FFO/AFFO, not net income, because GAAP depreciation distorts the picture.",
    examples: [
      "A company earning $5 EPS paying $2 in dividends has a 40% payout ratio.",
      "A REIT with $3 AFFO paying $2.40 has an 80% payout ratio — typical and healthy for a REIT.",
    ],
    relatedSlugs: ["dividend-yield", "dividend-coverage", "free-cash-flow"],
  },
  {
    slug: "dividend-aristocrat",
    term: "Dividend Aristocrat",
    short:
      "An S&P 500 company that has raised its dividend every year for at least 25 consecutive years.",
    body: "Dividend Aristocrats are members of the S&P 500 Dividend Aristocrats Index, which requires 25+ consecutive years of dividend increases. The list is rebalanced annually. Aristocrats tend to be mature, profitable businesses (consumer staples, healthcare, industrials) with disciplined capital allocation. The track record doesn't guarantee future increases — companies can and do get removed when they cut. Adjacent labels: Kings (50+ years), Champions (25+ years not necessarily S&P 500), Contenders (10-24 years), Challengers (5-9 years).",
    examples: [
      "Procter & Gamble (PG) — 67+ years of consecutive increases.",
      "Coca-Cola (KO) — 60+ years.",
    ],
    relatedSlugs: ["dividend-king", "dividend-growth", "consecutive-increases"],
  },
  {
    slug: "dividend-king",
    term: "Dividend King",
    short:
      "A company that has raised its dividend every year for at least 50 consecutive years.",
    body: "Dividend Kings are the rarest tier of dividend-growth stocks: 50+ consecutive annual increases. No index requires S&P 500 membership, so the list includes some non-S&P names. Kings are typically deep-moat businesses — consumer staples, regulated utilities, industrials — that have survived multiple recessions while continuing to grow their payouts. Membership is small (around 50 names at any time) and updates as companies join or get removed for not increasing.",
    examples: [
      "Procter & Gamble, Coca-Cola, Johnson & Johnson, 3M.",
    ],
    relatedSlugs: ["dividend-aristocrat", "dividend-growth"],
  },
  {
    slug: "dividend-coverage",
    term: "Dividend Coverage Ratio",
    short:
      "Net income (or free cash flow) divided by total dividends paid — the inverse of the payout ratio.",
    body: "Coverage tells you how many times over the company's earnings or cash flow can pay the dividend. 1.0× means earnings exactly equal the dividend (no buffer); 2.0× means twice covered, comfortable. Use FCF coverage for REITs and capital-intensive businesses where GAAP earnings understate cash. A falling coverage ratio over multiple quarters is an early warning of a potential cut.",
    relatedSlugs: ["payout-ratio", "free-cash-flow", "dividend-cut"],
  },
  {
    slug: "free-cash-flow",
    term: "Free Cash Flow (FCF)",
    short:
      "Operating cash flow minus capital expenditures — the cash a business actually has left to return to shareholders.",
    body: "FCF = cash from operations - capex. It's the closest GAAP-based proxy for sustainable distributable cash. Unlike net income, FCF isn't distorted by non-cash depreciation. For dividend investors, sustainable dividends require FCF > dividends paid; everything else (buybacks, M&A, debt paydown) competes for what's left. Be cautious with companies that grow FCF only by cutting capex — that boosts the headline but starves future growth.",
    relatedSlugs: ["payout-ratio", "dividend-coverage", "capex"],
  },
  {
    slug: "dividend-capture",
    term: "Dividend Capture",
    short:
      "A short-term strategy that buys a stock just before its ex-dividend date and sells once the price recovers.",
    body: "The goal: collect the dividend while limiting capital exposure. The challenge: stock prices typically drop by approximately the dividend amount on the ex-date, so the strategy only profits if (a) the price recovers fully within your holding window, and (b) transaction costs + taxes don't eat the dividend. Recovery time varies widely by stock — high-quality large caps may recover in days; thinly-traded names may take weeks. Effective capture-trading requires sub-5-day average recovery and minimal trading costs.",
    relatedSlugs: ["ex-dividend-date", "recovery-days", "qualified-dividend"],
  },
  {
    slug: "record-date",
    term: "Record Date",
    short:
      "The date on which a company checks its shareholder register to determine who is eligible for the dividend.",
    body: "If your name is on the books as of the close of the record date, you get the dividend. The record date is typically 1-2 business days after the ex-dividend date because trade settlement takes time. As an investor, you don't usually pay attention to the record date — the ex-date is what matters for buying/selling decisions.",
    relatedSlugs: ["ex-dividend-date", "payment-date"],
  },
  {
    slug: "payment-date",
    term: "Payment Date",
    short:
      "The date the dividend is actually paid to eligible shareholders.",
    body: "Cash hits brokerage accounts on the payment date — usually 2-4 weeks after the ex-dividend date. For DRIPs (dividend reinvestment plans), shares are issued or purchased on or shortly after this date.",
    relatedSlugs: ["ex-dividend-date", "record-date", "declaration-date"],
  },
  {
    slug: "declaration-date",
    term: "Declaration Date",
    short:
      "The date a company's board officially announces an upcoming dividend.",
    body: "The declaration sets the dividend amount, ex-dividend date, record date, and payment date in a single announcement. Until a dividend is declared, future payments are projections — boards can and do change them. Declaration timing also matters: a delay relative to the prior year's pattern can precede a cut, suspension, or special-payment announcement.",
    relatedSlugs: ["ex-dividend-date", "record-date", "payment-date"],
  },
  {
    slug: "forward-dividend",
    term: "Forward Dividend",
    short:
      "An estimate of the next 12 months of dividends based on the most recent payment annualized.",
    body: "Most quoted yields are forward yields, computed as the most recent dividend × the payment frequency. A quarterly $0.50 dividend implies a $2.00 forward annual dividend. Forward figures can be misleading right after a hike (over-estimates if the new rate isn't sustainable) or right after a cut (under-states if the cut is one-off). Trailing 12-month dividends are the safer denominator for long-term yield analysis.",
    relatedSlugs: ["dividend-yield", "trailing-dividend"],
  },
  {
    slug: "yield-trap",
    term: "Yield Trap",
    short:
      "A high-yielding stock whose dividend is unlikely to be sustained — the high yield is a warning, not an opportunity.",
    body: "Yield rises mechanically when price falls. If a stock yields 12% it usually means the market expects a dividend cut, not that the company is uniquely generous. Common yield-trap signals: payout ratio above 100%, falling FCF, rising debt-to-EBITDA, sector-wide stress, or a yield more than 2× the sector median. The cure isn't a yield filter — it's checking sustainability via payout ratio, FCF coverage, and balance-sheet trends.",
    relatedSlugs: ["dividend-yield", "payout-ratio", "dividend-cut"],
  },
  {
    slug: "dividend-cut",
    term: "Dividend Cut",
    short:
      "A reduction in the per-share dividend versus the prior payment.",
    body: "Cuts can be partial (e.g. 50% reduction) or full (suspension to zero). They typically trigger sharp share-price declines because index-fund mandates, ETF rules, and income-investor rotation force selling. Causes range from one-off (asset sale unwound) to fundamental (deteriorating business). Most cuts are preceded by 6-18 months of declining FCF coverage, rising leverage, or sector stress.",
    relatedSlugs: ["dividend-coverage", "yield-trap", "payout-ratio"],
  },
  {
    slug: "qualified-dividend",
    term: "Qualified Dividend",
    short:
      "A dividend taxed at the lower long-term capital gains rate instead of ordinary income — US tax concept.",
    body: "To qualify, you must hold the stock for more than 60 days during the 121-day window centered on the ex-date. Most US corporate dividends qualify; many REIT distributions don't (they're taxed as ordinary income). Qualified-dividend status meaningfully reduces tax drag for high-income investors. Foreign withholding taxes, ADR fees, and stock-loan recalls can affect qualification.",
    relatedSlugs: ["ex-dividend-date", "reit"],
  },
];

export function getEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY.find((e) => e.slug === slug);
}
