import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HtmlLang } from "@/components/html-lang";
import { dividendCalendar, isoToday, isoDaysFromNow } from "@/lib/data";
import { tickerHref } from "@/lib/format";
import { faqJsonLd, jsonLdScript } from "@/lib/structured-data";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { pexelsImage } from "@/lib/seo";

// Reusable localized "service page": a functional dividend calendar backed by
// live ex-dividend data. The foreign calendar keywords (calendrier dividende,
// dividendenkalender, próximos dividendos) are tool/calendar intent, so they're
// served by this functional page rather than a blog article.

export type CalendarStrings = {
  h1: string;
  intro: string[];
  sectionTitle: string;
  th: { symbol: string; exDate: string; payment: string; amount: string; yield: string; frequency: string };
  empty: string;
  cta: { label: string; href: string }[];
  faqs: { q: string; a: string }[];
};

function fmtDate(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(HTML_LANG[locale], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export async function DividendCalendarService({
  locale,
  strings,
  cover,
  coverAlt,
}: {
  locale: Locale;
  strings: CalendarStrings;
  cover?: string;
  coverAlt?: string;
}) {
  let events: Awaited<ReturnType<typeof dividendCalendar>> = [];
  try {
    events = await dividendCalendar(isoToday(), isoDaysFromNow(30), 120);
  } catch {
    events = [];
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
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 100%)" }}
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
          {events.length === 0 ? (
            <div className="dv-empty">{strings.empty}</div>
          ) : (
            <div className="dv-table-wrap">
              <div className="dv-table-scroll">
                <table className="dv-table">
                  <thead>
                    <tr>
                      <th>{strings.th.symbol}</th>
                      <th>{strings.th.exDate}</th>
                      <th>{strings.th.payment}</th>
                      <th className="dv-th--num">{strings.th.amount}</th>
                      <th className="dv-th--num">{strings.th.yield}</th>
                      <th>{strings.th.frequency}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={`${e.symbol}-${e.date}-${i}`}>
                        <td>
                          <Link href={tickerHref(e.symbol)} className="dv-action-link">
                            {e.symbol}
                          </Link>
                        </td>
                        <td>{fmtDate(e.date, locale)}</td>
                        <td>{fmtDate(e.payment_date, locale)}</td>
                        <td className="dv-td--num">
                          {e.dividend != null ? e.dividend.toFixed(2) : "—"}
                        </td>
                        <td className="dv-td--num">
                          {e.yield != null ? `${e.yield.toFixed(2)}%` : "—"}
                        </td>
                        <td>{e.frequency ?? "—"}</td>
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
