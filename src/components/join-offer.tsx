/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseUrl } from "@/lib/env";

// Ported from the "uncoverd Pro" marketing prototype. All CSS is scoped under
// `.joinp` so the generic class names (.btn, .wrap, .hero…) can't leak into the
// rest of the site. No nav (the app's SiteHeader wraps this) and no fabricated
// performance chart — real rating history is only ~6 weeks, so a "beat the S&P"
// chart isn't yet defensible.

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
.joinp{
  --jbg:#06080d;--jbg2:#0b1018;--jpanel:rgba(255,255,255,0.024);--jpanel2:rgba(255,255,255,0.04);
  --jborder:rgba(255,255,255,0.08);--jborderS:rgba(255,255,255,0.14);--jink:#eef2f6;--jmuted:#8b95a4;
  --jfaint:#5b6472;--jgreen:#34d27e;--jgreenB:#46e58e;--jtint:rgba(52,210,126,0.12);--jr:18px;
  background:var(--jbg);color:var(--jink);font-family:"Hanken Grotesk",system-ui,sans-serif;font-size:17px;line-height:1.55;position:relative;overflow:hidden;-webkit-font-smoothing:antialiased;
}
.joinp *{box-sizing:border-box}
.joinp .jbgwrap{position:absolute;inset:0;z-index:0;overflow:hidden}
.joinp .jbgwrap::before{content:"";position:absolute;top:-30%;left:-10%;width:80%;height:90%;background:radial-gradient(closest-side, rgba(38,60,110,0.45), rgba(38,60,110,0) 70%);filter:blur(10px)}
.joinp .jbgwrap::after{content:"";position:absolute;top:38%;right:-15%;width:70%;height:80%;background:radial-gradient(closest-side, rgba(52,210,126,0.08), rgba(52,210,126,0) 70%)}
.joinp .jgrid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(120% 90% at 50% 0%, #000 30%, transparent 80%)}
.joinp .jwrap{max-width:1160px;margin:0 auto;padding:0 28px;position:relative;z-index:1}
.joinp h1,.joinp h2,.joinp h3{font-family:"Space Grotesk",sans-serif;letter-spacing:-0.02em;line-height:1.05}
.joinp .mono{font-family:"Space Mono",monospace}
.joinp .green{color:var(--jgreen)}.joinp .muted{color:var(--jmuted)}
.joinp .jbtn{display:inline-flex;align-items:center;justify-content:center;gap:9px;font-family:"Space Grotesk";font-weight:600;font-size:15.5px;border-radius:11px;padding:13px 22px;cursor:pointer;border:1px solid transparent;transition:transform .15s, box-shadow .25s, background .2s;white-space:nowrap;text-decoration:none}
.joinp .jbtn:active{transform:translateY(1px)}
.joinp .jbtn.green{background:var(--jgreen);color:#04130c;box-shadow:0 8px 30px -8px rgba(52,210,126,.6)}
.joinp .jbtn.green:hover{background:var(--jgreenB);box-shadow:0 12px 38px -8px rgba(52,210,126,.8)}
.joinp .jbtn.ghost{background:rgba(255,255,255,.04);color:var(--jink);border-color:var(--jborderS)}
.joinp .jbtn.ghost:hover{background:rgba(255,255,255,.09)}
.joinp .hero{padding:60px 0 36px;text-align:center}
.joinp .eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:var(--jmuted);background:var(--jpanel);border:1px solid var(--jborder);padding:7px 15px;border-radius:100px;margin-bottom:26px}
.joinp .eyebrow .pulse{width:7px;height:7px;border-radius:50%;background:var(--jgreen);box-shadow:0 0 0 0 rgba(52,210,126,.5);animation:jpulse 2.4s infinite}
@keyframes jpulse{0%{box-shadow:0 0 0 0 rgba(52,210,126,.5)}70%{box-shadow:0 0 0 10px rgba(52,210,126,0)}100%{box-shadow:0 0 0 0 rgba(52,210,126,0)}}
.joinp h1.hero-title{font-size:clamp(36px,6vw,68px);font-weight:700;max-width:15ch;margin:0 auto 22px;text-wrap:balance}
.joinp h1.hero-title em{font-style:normal;color:var(--jgreen)}
.joinp .hero-sub{font-size:clamp(16px,2vw,20px);color:var(--jmuted);max-width:60ch;margin:0 auto 40px}
.joinp .price-card{max-width:560px;margin:0 auto;background:linear-gradient(180deg, rgba(52,210,126,.07), rgba(255,255,255,.018));border:1px solid var(--jborderS);border-radius:24px;padding:34px 36px 30px;position:relative;overflow:hidden;box-shadow:0 40px 90px -40px rgba(0,0,0,.8)}
.joinp .price-card::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(52,210,126,.6),transparent)}
.joinp .price-row{display:flex;align-items:baseline;justify-content:center;gap:6px}
.joinp .price-big{font-family:"Space Grotesk";font-weight:700;font-size:74px;letter-spacing:-.04em;line-height:1}
.joinp .price-per{font-family:"Space Grotesk";font-size:22px;font-weight:500;color:var(--jmuted)}
.joinp .price-foot{margin-top:12px;font-size:15px;color:var(--jmuted)}
.joinp .price-foot b{color:var(--jink);font-weight:600}
.joinp .price-coffee{display:inline-flex;align-items:center;gap:8px;margin-top:16px;font-size:13.5px;color:var(--jgreen);background:var(--jtint);border:1px solid rgba(52,210,126,.25);padding:7px 14px;border-radius:100px;font-weight:600}
.joinp .price-ctas{display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap}
.joinp .micro{margin-top:18px;font-size:12.5px;color:var(--jfaint)}
.joinp .micro .mono{color:var(--jmuted)}
.joinp .logos{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:46px;opacity:.7}
.joinp .logos span{font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--jfaint);font-weight:600}
.joinp section.block{padding:72px 0}
.joinp .sec-head{text-align:center;max-width:62ch;margin:0 auto 44px}
.joinp .kicker{display:inline-block;font-family:"Space Mono";font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--jgreen);margin-bottom:16px}
.joinp h2.sec-title{font-size:clamp(28px,4.2vw,44px);font-weight:700;margin-bottom:16px;text-wrap:balance}
.joinp .sec-sub{font-size:18px;color:var(--jmuted)}
.joinp .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.joinp .feat{background:var(--jpanel);border:1px solid var(--jborder);border-radius:var(--jr);padding:26px;transition:transform .25s, border-color .25s, background .25s;position:relative;overflow:hidden}
.joinp .feat:hover{transform:translateY(-4px);border-color:var(--jborderS);background:var(--jpanel2)}
.joinp .feat .ftag{display:flex;align-items:center;gap:9px;font-family:"Space Grotesk";font-weight:600;font-size:17px;margin-bottom:12px}
.joinp .feat .ico{width:34px;height:34px;border-radius:9px;background:var(--jtint);border:1px solid rgba(52,210,126,.25);display:grid;place-items:center;flex:none}
.joinp .feat .ico svg{width:18px;height:18px;stroke:var(--jgreen);fill:none;stroke-width:1.7}
.joinp .feat p{font-size:14.5px;color:var(--jmuted)}
.joinp .feat.featured{grid-column:span 2;background:linear-gradient(120deg, rgba(52,210,126,.10), rgba(255,255,255,.02));border-color:rgba(52,210,126,.3);display:flex;gap:28px;align-items:center}
.joinp .feat.featured .fbody{flex:1}
.joinp .feat.featured .ftag{font-size:21px}
.joinp .feat.featured p{font-size:16px;max-width:46ch}
.joinp .hc-visual{flex:none;width:230px}
.joinp .hc-bar{display:flex;align-items:center;gap:10px;margin-bottom:11px;font-size:12.5px;font-family:"Space Mono";color:var(--jmuted)}
.joinp .hc-bar .track{flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden}
.joinp .hc-bar .fill{height:100%;border-radius:5px;background:linear-gradient(90deg,var(--jgreen),var(--jgreenB));width:0;transition:width 1.1s cubic-bezier(.2,.7,.2,1)}
.joinp .hc-bar .fill.red{background:linear-gradient(90deg,#7a3b39,#e5736b)}
.joinp .hc-grade{display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:14px;border-top:1px solid var(--jborder)}
.joinp .hc-grade .g{font-family:"Space Grotesk";font-weight:700;font-size:34px;color:var(--jgreen)}
.joinp .hc-grade small{font-size:11px;color:var(--jfaint);font-family:"Space Mono";text-align:right;line-height:1.3}
.joinp .cmp{background:var(--jpanel);border:1px solid var(--jborder);border-radius:22px;overflow:hidden;max-width:900px;margin:0 auto}
.joinp .cmp-row{display:grid;grid-template-columns:1.6fr 1fr 1fr 40px;align-items:center;gap:8px;padding:18px 26px;border-top:1px solid var(--jborder);font-size:16px}
.joinp .cmp-row:first-child{border-top:none}
.joinp .cmp-head{font-family:"Space Mono";font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--jfaint);padding-top:16px;padding-bottom:14px}
.joinp .cmp-head div:not(:first-child){text-align:right}
.joinp .cmp-row .svc{font-weight:600}
.joinp .cmp-row .yr{text-align:right;font-family:"Space Grotesk";font-weight:600;color:var(--jmuted)}
.joinp .cmp-row .wk{text-align:right;font-family:"Space Mono";font-size:14px;color:var(--jfaint)}
.joinp .cmp-row .chk{text-align:center}
.joinp .cmp-row.us{background:linear-gradient(90deg, rgba(52,210,126,.13), rgba(52,210,126,.04));border-top:1px solid rgba(52,210,126,.3)}
.joinp .cmp-row.us .svc{display:flex;align-items:center;gap:12px;font-family:"Space Grotesk";font-weight:700;font-size:18px}
.joinp .cmp-row.us .yr{color:var(--jgreen);font-size:19px}
.joinp .cmp-row.us .wk{color:var(--jgreen)}
.joinp .badge{font-family:"Space Mono";font-size:10px;font-weight:700;letter-spacing:.08em;background:var(--jgreen);color:#04130c;padding:3px 8px;border-radius:6px;white-space:nowrap}
.joinp .chk-y{color:var(--jgreen)}.joinp .chk-n{color:var(--jfaint)}
.joinp .cmp-note{text-align:center;font-size:13px;color:var(--jfaint);margin:18px auto 0;max-width:70ch}
.joinp .save-pill{display:inline-block;margin-top:8px;font-size:13px;color:var(--jgreen);font-weight:600}
.joinp .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--jborder);border:1px solid var(--jborder);border-radius:22px;overflow:hidden}
.joinp .stats div{background:var(--jbg2);padding:30px 26px;text-align:center}
.joinp .stats .n{font-family:"Space Grotesk";font-weight:700;font-size:38px;color:var(--jgreen)}
.joinp .stats .l{font-size:13.5px;color:var(--jmuted);margin-top:8px}
.joinp .final{background:linear-gradient(180deg, rgba(52,210,126,.1), rgba(52,210,126,.02));border:1px solid rgba(52,210,126,.28);border-radius:28px;padding:56px 40px;text-align:center;position:relative;overflow:hidden}
.joinp .final::after{content:"";position:absolute;inset:0;background:radial-gradient(80% 120% at 50% -20%, rgba(52,210,126,.18), transparent 60%);pointer-events:none}
.joinp .final h2{font-size:clamp(28px,4.4vw,46px);font-weight:700;margin-bottom:14px;position:relative}
.joinp .final p{font-size:18px;color:var(--jmuted);margin-bottom:14px;position:relative}
.joinp .final .price-line{font-family:"Space Grotesk";font-weight:600;font-size:20px;margin-bottom:28px;position:relative}
.joinp .final .price-line .green{font-size:24px}
.joinp .final .price-ctas{justify-content:center;position:relative}
.joinp .disc{font-size:12px;color:var(--jfaint);max-width:74ch;line-height:1.6;margin:40px auto 0;text-align:center}
.joinp .reveal{opacity:0;transform:translateY(22px);transition:opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1)}
.joinp .reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.joinp .reveal{opacity:1;transform:none;transition:none}}
@media(max-width:900px){.joinp .feat-grid{grid-template-columns:repeat(2,1fr)}.joinp .feat.featured{grid-column:span 2;flex-direction:column;align-items:flex-start}.joinp .hc-visual{width:100%}}
@media(max-width:760px){.joinp .stats{grid-template-columns:repeat(2,1fr)}}
@media(max-width:620px){.joinp .cmp-row{grid-template-columns:1.4fr 1fr 30px;font-size:14px}.joinp .cmp-row .wk,.joinp .cmp-head div:nth-child(3){display:none}}
@media(max-width:560px){.joinp .feat-grid{grid-template-columns:1fr}.joinp .feat.featured{grid-column:span 1}}
`;

const COMPETITORS = [
  { name: "Morningstar Investor", yr: "$249", wk: "$4.79 / wk" },
  { name: "Seeking Alpha Premium", yr: "$299", wk: "$5.75 / wk" },
  { name: "Zacks Premium", yr: "$249", wk: "$4.79 / wk" },
  { name: "MarketBeat All Access", yr: "$399", wk: "$7.67 / wk" },
];

export function JoinOffer() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  async function startCheckout() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push(`/signup?next=${encodeURIComponent("/join")}`); return; }
      const res = await fetch(`${getSupabaseUrl()}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "plus" }),
      });
      const payload = await res.json();
      if (payload?.url) { window.location.assign(payload.url); return; }
    } catch { /* fall through */ }
    setBusy(false);
  }

  // Reveal-on-scroll + animate the healthcheck bars + count-up the 65k stat.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fire = (el: Element) => {
      el.querySelectorAll<HTMLElement>(".hc-bar .fill").forEach((f) => { if (f.dataset.w) f.style.width = f.dataset.w; });
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
        const target = parseFloat(n.dataset.count || "0"); const suffix = n.dataset.suffix || "";
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1200); const e = 1 - Math.pow(1 - t, 3);
          n.textContent = (target >= 1000 ? Math.round(target * e).toLocaleString() : (target * e).toFixed(0)) + suffix;
          if (t < 1) requestAnimationFrame(tick);
          else n.textContent = (target >= 1000 ? Math.round(target).toLocaleString() : String(target)) + suffix;
        };
        requestAnimationFrame(tick);
      });
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); fire(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const Ctas = ({ inFinal = false, single = false }: { inFinal?: boolean; single?: boolean }) => (
    <div className="price-ctas">
      <button onClick={startCheckout} disabled={busy} className="jbtn green">{busy ? "Redirecting…" : (single ? "Choose Pro →" : inFinal ? "Get Pro — $100 / year" : "Start free, then go Pro →")}</button>
      {!single && <Link href="/signup?next=%2Fjoin" className="jbtn ghost">{inFinal ? "Start with a free account" : "See a sample rating"}</Link>}
    </div>
  );

  return (
    <div className="joinp" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="jbgwrap"><div className="jgrid" /></div>

      {/* Hero */}
      <header className="hero">
        <div className="jwrap">
          <div className="eyebrow reveal"><span className="pulse" /> Independent ratings on 65,000+ stocks &amp; ETFs</div>
          <h1 className="hero-title reveal">Enhance your portfolio for <em>less than $2 a week</em></h1>
          <p className="hero-sub reveal">Unlimited A–F ratings, a portfolio tool that tells you exactly how to cut risk and size positions, an idea finder, and the monthly top picks. Increase returns and reduce risk — with the tools, not guesswork.</p>
          <div className="price-card reveal">
            <div className="price-row"><span className="price-big">$1.92</span><span className="price-per">/ week</span></div>
            <p className="price-foot">That's just <b>$100 a year</b> — billed once, <span className="green">cancel anytime</span>.</p>
            <div className="price-coffee">☕ Less than a single coffee — for the most research per dollar in the market</div>
            <Ctas single />
            <p className="micro"><span className="mono">No tiers · no add-ons · no upsells</span> — one flat price, everything included.</p>
          </div>
          <div className="logos reveal">
            <span>As good as services 4× the price</span>
            <span>· Built on SEC filings, not opinions</span>
            <span>· Recomputed daily</span>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="block">
        <div className="jwrap">
          <div className="sec-head reveal">
            <span className="kicker">What you unlock</span>
            <h2 className="sec-title">Everything you need, nothing you don't</h2>
            <p className="sec-sub">Six tools that turn a watchlist into a plan — rate anything, fix your portfolio, find your next idea.</p>
          </div>
          <div className="feat-grid">
            <div className="feat featured reveal">
              <div className="fbody">
                <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M3 12h4l2 6 4-14 2 8h6" /></svg></span> Portfolio Healthcheck</div>
                <p>Grade your portfolio's <b>real risk</b> in seconds. The tool flags overexposed positions, recommends exact sizing, shows where to trim to cut drawdowns, and benchmarks the whole thing against the S&amp;P 500 — so you know how to <b className="green">increase returns and reduce risk</b> before you trade.</p>
              </div>
              <div className="hc-visual">
                <div className="hc-bar"><span style={{ width: 64 }}>Risk</span><div className="track"><div className="fill red" data-w="78%" /></div></div>
                <div className="hc-bar"><span style={{ width: 64 }}>Yield</span><div className="track"><div className="fill" data-w="71%" /></div></div>
                <div className="hc-bar"><span style={{ width: 64 }}>Quality</span><div className="track"><div className="fill" data-w="88%" /></div></div>
                <div className="hc-bar"><span style={{ width: 64 }}>Diversify</span><div className="track"><div className="fill" data-w="46%" /></div></div>
                <div className="hc-grade"><span className="g">B+</span><small>Trim 2 positions<br />to reach A–</small></div>
              </div>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M12 3v18M5 9l7-6 7 6" /><circle cx="12" cy="15" r="3" /></svg></span> Unlimited A–F ratings</div>
              <p>Composite grades across Value, Growth, Profitability, Momentum &amp; Health on every one of 65,000+ tickers — standardised against industry peers. Rate as many as you like.</p>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M7 7h10v10M7 17 17 7" /></svg></span> Alternatives finder</div>
              <p>Hand it any stock or ETF and get better-rated swaps — investment ideas that fit your preferences in seconds. Upgrade a holding without leaving the page.</p>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg></span> Best-of lists</div>
              <p>This month's #1 pick, best dividend stocks, best monthly payers and sector leaders — ranked by the model and refreshed continuously, with price and yield on each.</p>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg></span> Model portfolios</div>
              <p>Ready-built High-Yield, Growth and Protection baskets, constructed straight from the ratings — start from a vetted shortlist, not a blank screener.</p>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M3 20h18M7 20V9m5 11V4m5 16v-7" /></svg></span> Benchmark anything</div>
              <p>Compare any two stocks side by side, export any list to CSV for your own models, and browse the entire site completely ad-free.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="block">
        <div className="jwrap">
          <div className="sec-head reveal">
            <span className="kicker">The math</span>
            <h2 className="sec-title">The most research for the least money</h2>
            <p className="sec-sub">Comparable investing-research services, at their annual list price. We do the same job — for a fraction of the weekly cost.</p>
          </div>
          <div className="cmp reveal">
            <div className="cmp-row cmp-head"><div>Service</div><div>Per year</div><div>Per week</div><div /></div>
            <div className="cmp-row us">
              <div className="svc"><span className="badge">BEST VALUE</span> uncoverd Pro</div>
              <div className="yr">$100</div><div className="wk">$1.92 / wk</div><div className="chk chk-y">✓</div>
            </div>
            {COMPETITORS.map((c) => (
              <div className="cmp-row" key={c.name}>
                <div className="svc">{c.name}</div><div className="yr">{c.yr}</div><div className="wk">{c.wk}</div><div className="chk chk-n">✕</div>
              </div>
            ))}
          </div>
          <p className="cmp-note">Prices are each service's standard annual list price and may vary. uncoverd Pro is a flat $100/year — no tiers or add-ons.<br /><span className="save-pill">→ Choosing uncoverd Pro saves you up to $299 a year vs. the field.</span></p>
        </div>
      </section>

      {/* Stats */}
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="jwrap">
          <div className="stats reveal">
            <div><div className="n">5</div><div className="l">Pillars per rating — Value, Growth, Profitability, Momentum, Health</div></div>
            <div><div className="n" data-count="65000" data-suffix="+">0</div><div className="l">Stocks &amp; ETFs rated, standardised against industry peers</div></div>
            <div><div className="n">Daily</div><div className="l">Recompute on fresh data — built on SEC filings, not opinions</div></div>
            <div><div className="n">∞</div><div className="l">Unlimited ratings, lists and healthchecks — no usage caps</div></div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="block" style={{ paddingTop: 10 }}>
        <div className="jwrap">
          <div className="final reveal">
            <h2>Start finding safer, higher-returning dividends</h2>
            <p>One flat price, everything included, cancel whenever you like.</p>
            <div className="price-line">Just <span className="green">$1.92 / week</span> &nbsp;·&nbsp; <span className="muted">$100 billed once a year</span></div>
            <Ctas inFinal />
          </div>
          <p className="disc">uncoverd Pro provides quantitative ratings and tools for informational purposes only and is not investment advice. Ratings are generated from public filings and market data. Investing involves risk, including possible loss of principal.</p>
        </div>
      </section>
    </div>
  );
}
