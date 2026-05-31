// JSON-LD generators for SEO + GEO (AI search). Each returns a JS object
// that callers serialize into a <script type="application/ld+json"> tag.
// Schema.org reference: https://schema.org

import { APP_NAME } from "@/lib/branding";

const BASE = "https://uncoverd.org";

type Breadcrumb = { name: string; url: string };

export function breadcrumbList(items: Breadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE}${item.url}`,
    })),
  };
}

export type StockJsonLdInput = {
  symbol: string;
  name: string | null;
  description?: string | null;
  exchange?: string | null;
  sector?: string | null;
  industry?: string | null;
  website?: string | null;
  image?: string | null;
  price?: number | null;
  currency?: string | null;
  dividend_yield?: number | null;
  annual_dividend?: number | null;
};

// Schema.org doesn't have a perfect "Stock" type, but FinancialProduct +
// PriceSpecification works for both Google's rich results and AI engines.
// We also attach a Corporation so the entity is unambiguous.
export function stockJsonLd(s: StockJsonLdInput) {
  const url = `${BASE}/stocks/${s.symbol}`;
  return {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "@id": url,
    url,
    name: s.name ?? s.symbol,
    description:
      s.description?.slice(0, 350) ??
      `${s.name ?? s.symbol} (${s.symbol}) dividend yield, payout history, ratings, and financials on ${APP_NAME}.`,
    identifier: s.symbol,
    image: s.image ?? `${BASE}/opengraph-image`,
    provider: {
      "@type": "Organization",
      name: APP_NAME,
      url: BASE,
    },
    category: s.sector ?? undefined,
    interestRate:
      s.dividend_yield != null
        ? {
            "@type": "QuantitativeValue",
            value: s.dividend_yield,
            unitText: "PERCENT",
          }
        : undefined,
    feesAndCommissionsSpecification:
      s.annual_dividend != null
        ? `Forward annual dividend: ${s.annual_dividend.toFixed(2)} ${s.currency ?? "USD"}`
        : undefined,
    aggregateRating: undefined, // populated by callers when ratings exist
  };
}

export type EtfJsonLdInput = StockJsonLdInput & {
  expense_ratio?: number | null;
  aum?: number | null;
  holdings_count?: number | null;
  etf_company?: string | null;
  asset_class?: string | null;
};

export function etfJsonLd(e: EtfJsonLdInput) {
  const url = `${BASE}/etfs/symbol/${e.symbol}`;
  return {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "@id": url,
    url,
    name: e.name ?? e.symbol,
    description:
      e.description?.slice(0, 350) ??
      `${e.name ?? e.symbol} (${e.symbol}) ETF — expense ratio, AUM, holdings, distributions on ${APP_NAME}.`,
    identifier: e.symbol,
    image: e.image ?? `${BASE}/opengraph-image`,
    provider: {
      "@type": "Organization",
      name: e.etf_company ?? APP_NAME,
      url: BASE,
    },
    category: e.asset_class ?? undefined,
    interestRate:
      e.dividend_yield != null
        ? {
            "@type": "QuantitativeValue",
            value: e.dividend_yield,
            unitText: "PERCENT",
          }
        : undefined,
    annualPercentageRate:
      e.expense_ratio != null
        ? {
            "@type": "QuantitativeValue",
            value: e.expense_ratio,
            unitText: "PERCENT",
            description: "Expense ratio",
          }
        : undefined,
  };
}

// FAQ block — these are the questions people actually search for. Each one
// answers in a sentence, with a citation pattern AI engines can extract.
export type FaqInput = {
  symbol: string;
  name: string | null;
  isEtf?: boolean;
  dividend_yield?: number | null;
  annual_dividend?: number | null;
  currency?: string | null;
  next_ex_date?: string | null;
  next_payment?: string | null;
  next_amount?: number | null;
  frequency?: string | null;
  has_dividends?: boolean;
};

export function dividendFaqs(f: FaqInput) {
  const display = f.name ?? f.symbol;
  const cur = f.currency ?? "USD";
  const isPayer = f.has_dividends || (f.dividend_yield != null && f.dividend_yield > 0);
  const yieldPct = f.dividend_yield != null ? f.dividend_yield.toFixed(2) : null;
  const annualDiv = f.annual_dividend != null ? `${f.annual_dividend.toFixed(2)} ${cur}` : null;

  const qa: { q: string; a: string }[] = [];

  qa.push({
    q: `Does ${f.symbol} pay a dividend?`,
    a: isPayer
      ? `Yes — ${display} pays a ${f.frequency?.toLowerCase() ?? "regular"} dividend${
          yieldPct ? `, currently yielding approximately ${yieldPct}%` : ""
        }.`
      : `As of the latest data, ${display} does not pay a dividend.`,
  });

  if (yieldPct) {
    qa.push({
      q: `What is ${f.symbol}'s dividend yield?`,
      a: `${display}'s forward dividend yield is approximately ${yieldPct}%${
        annualDiv ? ` (annualized dividend of ${annualDiv} per share)` : ""
      }.`,
    });
  }

  if (f.next_ex_date) {
    qa.push({
      q: `When is ${f.symbol}'s next ex-dividend date?`,
      a: `${display}'s next ex-dividend date is ${f.next_ex_date}${
        f.next_amount != null ? `, with a declared dividend of ${f.next_amount.toFixed(2)} ${cur} per share` : ""
      }${f.next_payment ? `, payable on ${f.next_payment}` : ""}.`,
    });
  }

  if (annualDiv) {
    qa.push({
      q: `How much is ${f.symbol}'s annual dividend?`,
      a: `${display}'s forward annual dividend is approximately ${annualDiv} per share.`,
    });
  }

  qa.push({
    q: `Is ${f.symbol} a ${f.isEtf ? "good ETF" : "good dividend stock"}?`,
    a: `${APP_NAME} computes a rating for ${display} based on ${
      f.isEtf ? "yield, AUM, expense ratio, and 1-year return" : "value, growth, profitability, momentum, and balance-sheet health"
    }. See the live rating, methodology, and historical data on the ${display} page.`,
  });

  return qa;
}

export function faqJsonLd(qa: { q: string; a: string }[]) {
  if (qa.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };
}

// Organization + Website schemas for the home page. Eligible for Google
// sitelinks search box + brand panels. AI engines parse these as the
// canonical "what is uncoverd" record.
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE}/#website`,
    url: BASE,
    name: APP_NAME,
    description:
      "Dividend stock research, screener, ratings, and model portfolios. Independent research built on top of SEC filings.",
    publisher: { "@id": `${BASE}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE}/#organization`,
    name: APP_NAME,
    url: BASE,
    logo: `${BASE}/favicon.ico`,
    description:
      "Independent dividend research platform covering 65,000+ stocks and 13,800+ ETFs with proprietary ratings derived from SEC filings.",
    knowsAbout: [
      "dividend stocks",
      "dividend ETFs",
      "ex-dividend dates",
      "dividend yield",
      "dividend growth investing",
      "monthly dividend stocks",
      "dividend capture strategy",
    ],
    sameAs: [],
  };
}

// Small helper to serialize JSON-LD into a script element string.
export function jsonLdScript(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
