import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { listStocks, formatPercent, formatCurrency } from "@/lib/data";
import { faqJsonLd, jsonLdScript } from "@/lib/structured-data";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { pexelsImage } from "@/lib/seo";

// Reusable localized "best dividend stocks" service page. Targets the
// country-index keywords (meilleures actions à dividende / CAC 40, beste
// dividenden aktien / DAX, mejores acciones dividendos / IBEX 35, migliori
// azioni dividendi / FTSE MIB) using live per-country dividend data.

export type ListStrings = {
  h1: string;
  intro: string[];
  sectionTitle: string;
  th: { symbol: string; name: string; sector: string; yield: string; price: string };
  empty: string;
  cta: { label: string; href: string }[];
  faqs: { q: string; a: string }[];
};

export async function DividendListService({
  locale,
  country,
  strings,
  cover,
  coverAlt,
}: {
  locale: Locale;
  country: string; // ISO 3166 alpha-2 (FR, DE, ES, IT)
  strings: ListStrings;
  cover?: string;
  coverAlt?: string;
}) {
  let rows: Awaited<ReturnType<typeof listStocks>> = [];
  try {
    rows = await listStocks({
      country,
      minDividend: 0.01,
      minMarketCap: 500_000_000,
      minYieldPct: 2,
      sortBy: "yield",
      limit: 30,
    });
  } catch {
    rows = [];
  }
  const faq = faqJsonLd(strings.faqs);

  return (
    <>
      {locale !== "en" && <HtmlLang lang={HTML_LANG[locale]} />}
      {faq && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faq) }} />
      )}
      <SiteHeader />
      <main className="dv-page">
        <header
          className="dv-page-header"
          style={{ background: "linear-gradient(135deg, #022c22 0%, #064e3b 100%)" }}
        >
          <h1>{strings.h1}</h1>
        </header>

        {cover && (
          <section className="dv-section">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pexelsImage(cover, 1280)}
              alt={coverAlt ?? strings.h1}
              width={1280}
              height={720}
              className="dv-blog-hero"
              fetchPriority="high"
            />
          </section>
        )}

        <section className="dv-section">
          <div className="dv-prose dv-blog-prose">
            {strings.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="dv-section">
          <h2 className="dv-section__title">{strings.sectionTitle}</h2>
          {rows.length === 0 ? (
            <div className="dv-empty">{strings.empty}</div>
          ) : (
            <div className="dv-table-wrap">
              <div className="dv-table-scroll">
                <table className="dv-table">
                  <thead>
                    <tr>
                      <th>{strings.th.symbol}</th>
                      <th>{strings.th.name}</th>
                      <th>{strings.th.sector}</th>
                      <th className="dv-th--num">{strings.th.yield}</th>
                      <th className="dv-th--num">{strings.th.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.symbol}>
                        <td>
                          <Link href={`/stocks/${r.symbol}`} className="dv-action-link">
                            {r.symbol}
                          </Link>
                        </td>
                        <td>{r.name ?? "—"}</td>
                        <td>{r.sector ?? "—"}</td>
                        <td className="dv-td--num">{formatPercent(r.dividend_yield)}</td>
                        <td className="dv-td--num">
                          {formatCurrency(r.price, { currency: r.currency })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="dv-section">
          <div className="dv-prose dv-blog-prose">
            <p>
              {strings.cta.map((c, i) => (
                <span key={c.href}>
                  {i > 0 && " · "}
                  <Link href={c.href} className="dv-action-link">
                    {c.label}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
