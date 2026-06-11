/* eslint-disable react/no-unescaped-entities */
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/use-locale";
import type { Locale } from "@/lib/i18n";

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

// Localized copy — SSR renders English; the locale cookie applies the user's
// language on hydration (site-wide pattern, see use-locale.ts).
type JoinStr = {
  eyebrow: string; titlePre: string; titleEm: string; sub: string;
  perWeek: string; footA: string; footB: string; footC: string; footGreen: string;
  coffee: string; micro: string; logos: [string, string, string];
  ctaSingle: string; ctaFinal: string; ctaStart: string; ctaGhostFinal: string; ctaGhost: string; redirecting: string;
  featKicker: string; featTitle: string; featSub: string;
  hcTag: string; hcBody: string; hcLabels: [string, string, string, string]; hcSmall: string;
  f2Tag: string; f2: string; f3Tag: string; f3: string; f4Tag: string; f4: string; f5Tag: string; f5: string; f6Tag: string; f6: string;
  cmpKicker: string; cmpTitle: string; cmpSub: string; cmpService: string; cmpYear: string; cmpWeek: string; badge: string; cmpNote: string; savePill: string;
  s1: string; s2: string; s3n: string; s3: string; s4: string;
  finalTitle: string; finalSub: string; finalJust: string; finalBilled: string; disc: string;
};
const JOIN_STR: Record<Locale, JoinStr> = {
  en: {
    eyebrow: "Independent ratings on 65,000+ stocks & ETFs",
    titlePre: "Enhance your portfolio for ", titleEm: "less than $2 a week",
    sub: "Unlimited A–F ratings, a portfolio tool that tells you exactly how to cut risk and size positions, an idea finder, and the monthly top picks. Increase returns and reduce risk — with the tools, not guesswork.",
    perWeek: "/ week", footA: "That's just ", footB: "$100 a year", footC: " — billed once, ", footGreen: "cancel anytime",
    coffee: "☕ Less than a single coffee — for the most research per dollar in the market",
    micro: "No tiers · no add-ons · no upsells — one flat price, everything included.",
    logos: ["As good as services 4× the price", "· Built on SEC filings, not opinions", "· Recomputed daily"],
    ctaSingle: "Choose Pro →", ctaFinal: "Get Pro — $100 / year", ctaStart: "Start free, then go Pro →", ctaGhostFinal: "Start with a free account", ctaGhost: "See a sample rating", redirecting: "Redirecting…",
    featKicker: "What you unlock", featTitle: "Everything you need, nothing you don't",
    featSub: "Six tools that turn a watchlist into a plan — rate anything, fix your portfolio, find your next idea.",
    hcTag: "Portfolio Healthcheck",
    hcBody: "Grade your portfolio's real risk in seconds. The tool flags overexposed positions, recommends exact sizing, shows where to trim to cut drawdowns, and benchmarks the whole thing against the S&P 500 — so you know how to increase returns and reduce risk before you trade.",
    hcLabels: ["Risk", "Yield", "Quality", "Diversify"], hcSmall: "Trim 2 positions\nto reach A–",
    f2Tag: "Unlimited A–F ratings", f2: "Composite grades across Value, Growth, Profitability, Momentum & Health on every one of 65,000+ tickers — standardised against industry peers. Rate as many as you like.",
    f3Tag: "Alternatives finder", f3: "Hand it any stock or ETF and get better-rated swaps — investment ideas that fit your preferences in seconds. Upgrade a holding without leaving the page.",
    f4Tag: "Best-of lists", f4: "This month's #1 pick, best dividend stocks, best monthly payers and sector leaders — ranked by the model and refreshed continuously, with price and yield on each.",
    f5Tag: "Model portfolios", f5: "Ready-built High-Yield, Growth and Protection baskets, constructed straight from the ratings — start from a vetted shortlist, not a blank screener.",
    f6Tag: "Benchmark anything", f6: "Compare any two stocks side by side, export any list to CSV for your own models, and browse the entire site completely ad-free.",
    cmpKicker: "The math", cmpTitle: "The most research for the least money",
    cmpSub: "Comparable investing-research services, at their annual list price. We do the same job — for a fraction of the weekly cost.",
    cmpService: "Service", cmpYear: "Per year", cmpWeek: "Per week", badge: "BEST VALUE",
    cmpNote: "Prices are each service's standard annual list price and may vary. uncoverd Pro is a flat $100/year — no tiers or add-ons.",
    savePill: "→ Choosing uncoverd Pro saves you up to $299 a year vs. the field.",
    s1: "Pillars per rating — Value, Growth, Profitability, Momentum, Health", s2: "Stocks & ETFs rated, standardised against industry peers",
    s3n: "Daily", s3: "Recompute on fresh data — built on SEC filings, not opinions", s4: "Unlimited ratings, lists and healthchecks — no usage caps",
    finalTitle: "Start finding safer, higher-returning dividends", finalSub: "One flat price, everything included, cancel whenever you like.",
    finalJust: "Just", finalBilled: "$100 billed once a year",
    disc: "uncoverd Pro provides quantitative ratings and tools for informational purposes only and is not investment advice. Ratings are generated from public filings and market data. Investing involves risk, including possible loss of principal.",
  },
  fr: {
    eyebrow: "Notations indépendantes sur plus de 65 000 actions et ETF",
    titlePre: "Améliorez votre portefeuille pour ", titleEm: "moins de 2 $ par semaine",
    sub: "Notations A–F illimitées, un outil de portefeuille qui vous dit exactement comment réduire le risque et dimensionner vos positions, un détecteur d'idées et les meilleurs choix du mois. Plus de rendement, moins de risque — avec des outils, pas des intuitions.",
    perWeek: "/ semaine", footA: "Soit seulement ", footB: "100 $ par an", footC: " — facturé une fois, ", footGreen: "résiliable à tout moment",
    coffee: "☕ Moins qu'un café — pour le meilleur ratio recherche/prix du marché",
    micro: "Pas de paliers · pas d'options payantes · pas d'upsell — un prix unique, tout inclus.",
    logos: ["Aussi bon que des services 4× plus chers", "· Construit sur les dépôts SEC, pas des opinions", "· Recalculé chaque jour"],
    ctaSingle: "Choisir Pro →", ctaFinal: "Passer Pro — 100 $ / an", ctaStart: "Commencer gratuitement, puis Pro →", ctaGhostFinal: "Commencer avec un compte gratuit", ctaGhost: "Voir un exemple de notation", redirecting: "Redirection…",
    featKicker: "Ce que vous débloquez", featTitle: "Tout ce qu'il faut, rien de superflu",
    featSub: "Six outils qui transforment une watchlist en plan — notez tout, réparez votre portefeuille, trouvez votre prochaine idée.",
    hcTag: "Bilan de portefeuille",
    hcBody: "Évaluez le risque réel de votre portefeuille en quelques secondes : positions surexposées, tailles recommandées, où alléger pour réduire les baisses, et comparaison complète face au S&P 500 — pour augmenter le rendement et réduire le risque avant de trader.",
    hcLabels: ["Risque", "Rendement", "Qualité", "Diversif."], hcSmall: "Allégez 2 positions\npour atteindre A–",
    f2Tag: "Notations A–F illimitées", f2: "Notes composites Valeur, Croissance, Rentabilité, Momentum et Santé sur plus de 65 000 titres — standardisées face aux pairs sectoriels. Notez autant que vous voulez.",
    f3Tag: "Détecteur d'alternatives", f3: "Donnez-lui n'importe quelle action ou ETF et obtenez des alternatives mieux notées — des idées qui collent à vos préférences en quelques secondes.",
    f4Tag: "Listes des meilleurs", f4: "Le choix n°1 du mois, les meilleures actions à dividende, les meilleurs payeurs mensuels et les leaders sectoriels — classés par le modèle, avec prix et rendement.",
    f5Tag: "Portefeuilles modèles", f5: "Des paniers Haut-Rendement, Croissance et Protection prêts à l'emploi, construits directement à partir des notations.",
    f6Tag: "Comparez tout", f6: "Comparez deux actions côte à côte, exportez n'importe quelle liste en CSV et naviguez sur tout le site sans aucune publicité.",
    cmpKicker: "Le calcul", cmpTitle: "Le plus de recherche pour le moins d'argent",
    cmpSub: "Les services de recherche comparables, à leur tarif annuel public. Nous faisons le même travail — pour une fraction du coût hebdomadaire.",
    cmpService: "Service", cmpYear: "Par an", cmpWeek: "Par semaine", badge: "MEILLEUR PRIX",
    cmpNote: "Les prix sont les tarifs annuels publics de chaque service et peuvent varier. uncoverd Pro est à 100 $/an, sans paliers ni options.",
    savePill: "→ Choisir uncoverd Pro vous économise jusqu'à 299 $ par an.",
    s1: "Piliers par notation — Valeur, Croissance, Rentabilité, Momentum, Santé", s2: "Actions et ETF notés, standardisés face aux pairs",
    s3n: "Quotidien", s3: "Recalcul sur données fraîches — fondé sur les dépôts SEC, pas des opinions", s4: "Notations, listes et bilans illimités — aucun plafond",
    finalTitle: "Trouvez des dividendes plus sûrs et plus rentables", finalSub: "Un prix unique, tout inclus, résiliez quand vous voulez.",
    finalJust: "Seulement", finalBilled: "100 $ facturés une fois par an",
    disc: "uncoverd Pro fournit des notations et outils quantitatifs à titre informatif uniquement et ne constitue pas un conseil en investissement. Les notations sont générées à partir de documents publics et de données de marché. Investir comporte des risques, y compris la perte du capital.",
  },
  de: {
    eyebrow: "Unabhängige Ratings für über 65.000 Aktien & ETFs",
    titlePre: "Verbessere dein Portfolio für ", titleEm: "weniger als 2 $ pro Woche",
    sub: "Unbegrenzte A–F-Ratings, ein Portfolio-Tool, das dir genau zeigt, wie du Risiko senkst und Positionen dimensionierst, ein Ideen-Finder und die Top-Picks des Monats. Mehr Rendite, weniger Risiko — mit Werkzeugen statt Bauchgefühl.",
    perWeek: "/ Woche", footA: "Das sind nur ", footB: "100 $ im Jahr", footC: " — einmal abgerechnet, ", footGreen: "jederzeit kündbar",
    coffee: "☕ Weniger als ein Kaffee — für die meiste Research pro Dollar am Markt",
    micro: "Keine Stufen · keine Add-ons · keine Upsells — ein Festpreis, alles inklusive.",
    logos: ["So gut wie Dienste zum 4-fachen Preis", "· Auf SEC-Filings gebaut, nicht auf Meinungen", "· Täglich neu berechnet"],
    ctaSingle: "Pro wählen →", ctaFinal: "Pro holen — 100 $ / Jahr", ctaStart: "Gratis starten, dann Pro →", ctaGhostFinal: "Mit Gratis-Konto starten", ctaGhost: "Beispiel-Rating ansehen", redirecting: "Weiterleitung…",
    featKicker: "Was du freischaltest", featTitle: "Alles, was du brauchst — nichts, was du nicht brauchst",
    featSub: "Sechs Tools, die aus einer Watchlist einen Plan machen — alles bewerten, das Portfolio reparieren, die nächste Idee finden.",
    hcTag: "Portfolio-Check",
    hcBody: "Bewerte das echte Risiko deines Portfolios in Sekunden: überexponierte Positionen, empfohlene Größen, wo kürzen, um Drawdowns zu senken — und der Vergleich gegen den S&P 500. Mehr Rendite, weniger Risiko, bevor du handelst.",
    hcLabels: ["Risiko", "Rendite", "Qualität", "Streuung"], hcSmall: "2 Positionen kürzen\nfür A–",
    f2Tag: "Unbegrenzte A–F-Ratings", f2: "Composite-Noten für Bewertung, Wachstum, Profitabilität, Momentum & Gesundheit auf über 65.000 Titeln — standardisiert gegen Branchen-Peers.",
    f3Tag: "Alternativen-Finder", f3: "Gib ihm eine beliebige Aktie oder einen ETF und erhalte besser bewertete Alternativen — Ideen nach deinen Präferenzen, in Sekunden.",
    f4Tag: "Bestenlisten", f4: "Der Nr.-1-Pick des Monats, die besten Dividendenaktien, Monatszahler und Sektorführer — vom Modell gerankt, laufend aktualisiert.",
    f5Tag: "Modellportfolios", f5: "Fertige High-Yield-, Wachstums- und Schutz-Körbe, direkt aus den Ratings gebaut — starte mit einer geprüften Shortlist.",
    f6Tag: "Alles vergleichen", f6: "Vergleiche zwei Aktien Seite an Seite, exportiere jede Liste als CSV und nutze die gesamte Seite komplett werbefrei.",
    cmpKicker: "Die Rechnung", cmpTitle: "Die meiste Research fürs wenigste Geld",
    cmpSub: "Vergleichbare Research-Dienste zu ihren Listenpreisen. Wir machen denselben Job — für einen Bruchteil der Wochenkosten.",
    cmpService: "Dienst", cmpYear: "Pro Jahr", cmpWeek: "Pro Woche", badge: "BESTER WERT",
    cmpNote: "Preise sind die regulären Jahres-Listenpreise der Anbieter und können abweichen. uncoverd Pro kostet pauschal 100 $/Jahr — ohne Stufen oder Add-ons.",
    savePill: "→ Mit uncoverd Pro sparst du bis zu 299 $ pro Jahr.",
    s1: "Säulen je Rating — Bewertung, Wachstum, Profitabilität, Momentum, Gesundheit", s2: "Bewertete Aktien & ETFs, standardisiert gegen Peers",
    s3n: "Täglich", s3: "Neuberechnung auf frischen Daten — SEC-Filings statt Meinungen", s4: "Unbegrenzte Ratings, Listen und Checks — keine Limits",
    finalTitle: "Finde sicherere Dividenden mit mehr Rendite", finalSub: "Ein Festpreis, alles inklusive, jederzeit kündbar.",
    finalJust: "Nur", finalBilled: "100 $, einmal jährlich abgerechnet",
    disc: "uncoverd Pro liefert quantitative Ratings und Tools ausschließlich zu Informationszwecken und ist keine Anlageberatung. Ratings entstehen aus öffentlichen Unterlagen und Marktdaten. Investieren birgt Risiken bis hin zum Kapitalverlust.",
  },
  es: {
    eyebrow: "Calificaciones independientes de más de 65.000 acciones y ETFs",
    titlePre: "Mejora tu cartera por ", titleEm: "menos de 2 $ a la semana",
    sub: "Calificaciones A–F ilimitadas, una herramienta que te dice exactamente cómo reducir el riesgo y dimensionar posiciones, un buscador de ideas y los mejores valores del mes. Más rentabilidad y menos riesgo — con herramientas, no corazonadas.",
    perWeek: "/ semana", footA: "Son solo ", footB: "100 $ al año", footC: " — un único cobro, ", footGreen: "cancela cuando quieras",
    coffee: "☕ Menos que un café — la mayor investigación por dólar del mercado",
    micro: "Sin niveles · sin extras · sin upselling — un precio plano, todo incluido.",
    logos: ["Tan bueno como servicios 4× más caros", "· Construido sobre informes SEC, no opiniones", "· Recalculado a diario"],
    ctaSingle: "Elegir Pro →", ctaFinal: "Hazte Pro — 100 $ / año", ctaStart: "Empieza gratis y pasa a Pro →", ctaGhostFinal: "Empezar con una cuenta gratis", ctaGhost: "Ver una calificación de ejemplo", redirecting: "Redirigiendo…",
    featKicker: "Lo que desbloqueas", featTitle: "Todo lo que necesitas, nada que te sobre",
    featSub: "Seis herramientas que convierten una watchlist en un plan — califica lo que sea, arregla tu cartera, encuentra tu próxima idea.",
    hcTag: "Chequeo de cartera",
    hcBody: "Evalúa el riesgo real de tu cartera en segundos: posiciones sobreexpuestas, tamaños recomendados, dónde recortar para reducir caídas, y la comparación completa contra el S&P 500 — para subir la rentabilidad y bajar el riesgo antes de operar.",
    hcLabels: ["Riesgo", "Rentab.", "Calidad", "Diversif."], hcSmall: "Recorta 2 posiciones\npara llegar a A–",
    f2Tag: "Calificaciones A–F ilimitadas", f2: "Notas compuestas de Valor, Crecimiento, Rentabilidad, Momentum y Salud en más de 65.000 valores — estandarizadas frente a sus pares sectoriales.",
    f3Tag: "Buscador de alternativas", f3: "Dale cualquier acción o ETF y obtén alternativas mejor calificadas — ideas que encajan con tus preferencias en segundos.",
    f4Tag: "Listas de los mejores", f4: "La elección nº1 del mes, las mejores acciones de dividendo, los mejores pagadores mensuales y los líderes sectoriales — clasificados por el modelo y actualizados continuamente.",
    f5Tag: "Carteras modelo", f5: "Cestas de Alto Rendimiento, Crecimiento y Protección listas para usar, construidas directamente desde las calificaciones.",
    f6Tag: "Compara lo que sea", f6: "Compara dos acciones lado a lado, exporta cualquier lista a CSV y navega todo el sitio sin publicidad.",
    cmpKicker: "Las cuentas", cmpTitle: "La mayor investigación por el menor dinero",
    cmpSub: "Servicios de investigación comparables, a su precio anual de lista. Hacemos el mismo trabajo — por una fracción del coste semanal.",
    cmpService: "Servicio", cmpYear: "Al año", cmpWeek: "A la semana", badge: "MEJOR VALOR",
    cmpNote: "Los precios son las tarifas anuales estándar de cada servicio y pueden variar. uncoverd Pro cuesta 100 $/año fijos — sin niveles ni extras.",
    savePill: "→ Elegir uncoverd Pro te ahorra hasta 299 $ al año.",
    s1: "Pilares por calificación — Valor, Crecimiento, Rentabilidad, Momentum, Salud", s2: "Acciones y ETFs calificados, estandarizados frente a pares",
    s3n: "Diario", s3: "Recálculo con datos frescos — informes SEC, no opiniones", s4: "Calificaciones, listas y chequeos ilimitados — sin topes",
    finalTitle: "Encuentra dividendos más seguros y rentables", finalSub: "Un precio plano, todo incluido, cancela cuando quieras.",
    finalJust: "Solo", finalBilled: "100 $ cobrados una vez al año",
    disc: "uncoverd Pro ofrece calificaciones y herramientas cuantitativas con fines exclusivamente informativos y no constituye asesoramiento de inversión. Las calificaciones se generan a partir de documentos públicos y datos de mercado. Invertir conlleva riesgos, incluida la pérdida del capital.",
  },
  it: {
    eyebrow: "Valutazioni indipendenti su oltre 65.000 azioni ed ETF",
    titlePre: "Migliora il tuo portafoglio per ", titleEm: "meno di 2 $ a settimana",
    sub: "Valutazioni A–F illimitate, uno strumento che ti dice esattamente come ridurre il rischio e dimensionare le posizioni, un cercatore di idee e le migliori scelte del mese. Più rendimento, meno rischio — con gli strumenti, non a intuito.",
    perWeek: "/ settimana", footA: "Sono solo ", footB: "100 $ l'anno", footC: " — addebito unico, ", footGreen: "disdici quando vuoi",
    coffee: "☕ Meno di un caffè — per la maggior ricerca per dollaro sul mercato",
    micro: "Niente livelli · niente extra · niente upselling — un prezzo unico, tutto incluso.",
    logos: ["Buono quanto servizi che costano 4 volte tanto", "· Costruito sui filing SEC, non su opinioni", "· Ricalcolato ogni giorno"],
    ctaSingle: "Scegli Pro →", ctaFinal: "Passa a Pro — 100 $ / anno", ctaStart: "Inizia gratis, poi Pro →", ctaGhostFinal: "Inizia con un account gratuito", ctaGhost: "Vedi una valutazione di esempio", redirecting: "Reindirizzamento…",
    featKicker: "Cosa sblocchi", featTitle: "Tutto ciò che serve, niente di superfluo",
    featSub: "Sei strumenti che trasformano una watchlist in un piano — valuta qualsiasi cosa, sistema il portafoglio, trova la prossima idea.",
    hcTag: "Check del portafoglio",
    hcBody: "Valuta il rischio reale del tuo portafoglio in pochi secondi: posizioni sovraesposte, dimensioni consigliate, dove alleggerire per ridurre i drawdown, e il confronto completo con l'S&P 500 — per aumentare il rendimento e ridurre il rischio prima di operare.",
    hcLabels: ["Rischio", "Rendim.", "Qualità", "Diversif."], hcSmall: "Alleggerisci 2 posizioni\nper arrivare ad A–",
    f2Tag: "Valutazioni A–F illimitate", f2: "Voti compositi su Valore, Crescita, Redditività, Momentum e Salute per oltre 65.000 titoli — standardizzati rispetto ai pari di settore.",
    f3Tag: "Cercatore di alternative", f3: "Dagli qualsiasi azione o ETF e ottieni alternative meglio valutate — idee in linea con le tue preferenze in pochi secondi.",
    f4Tag: "Liste dei migliori", f4: "La scelta n.1 del mese, le migliori azioni a dividendo, i migliori pagatori mensili e i leader di settore — classificati dal modello e aggiornati di continuo.",
    f5Tag: "Portafogli modello", f5: "Panieri High-Yield, Crescita e Protezione già pronti, costruiti direttamente dalle valutazioni.",
    f6Tag: "Confronta tutto", f6: "Confronta due azioni fianco a fianco, esporta qualsiasi lista in CSV e naviga l'intero sito senza pubblicità.",
    cmpKicker: "I conti", cmpTitle: "La maggior ricerca per il minor prezzo",
    cmpSub: "Servizi di ricerca comparabili, al loro prezzo annuale di listino. Facciamo lo stesso lavoro — per una frazione del costo settimanale.",
    cmpService: "Servizio", cmpYear: "All'anno", cmpWeek: "A settimana", badge: "MIGLIOR VALORE",
    cmpNote: "I prezzi sono i listini annuali standard di ciascun servizio e possono variare. uncoverd Pro costa 100 $/anno fissi — senza livelli né extra.",
    savePill: "→ Scegliendo uncoverd Pro risparmi fino a 299 $ l'anno.",
    s1: "Pilastri per valutazione — Valore, Crescita, Redditività, Momentum, Salute", s2: "Azioni ed ETF valutati, standardizzati sui pari",
    s3n: "Ogni giorno", s3: "Ricalcolo su dati freschi — filing SEC, non opinioni", s4: "Valutazioni, liste e check illimitati — nessun limite",
    finalTitle: "Trova dividendi più sicuri e più redditizi", finalSub: "Un prezzo unico, tutto incluso, disdici quando vuoi.",
    finalJust: "Solo", finalBilled: "100 $ addebitati una volta l'anno",
    disc: "uncoverd Pro fornisce valutazioni e strumenti quantitativi a solo scopo informativo e non costituisce consulenza finanziaria. Le valutazioni derivano da documenti pubblici e dati di mercato. Investire comporta rischi, inclusa la perdita del capitale.",
  },
};

export function JoinOffer() {
  const router = useRouter();
  const t = JOIN_STR[useLocale()];
  const [busy, setBusy] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Single checkout entry — /go-pro handles auth (logged-out users are sent to
  // create an account first, then returned to checkout) and redirects to Stripe.
  function startCheckout() {
    if (busy) return;
    setBusy(true);
    router.push("/go-pro");
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

  // Plain render helper (not a component) so React state in the parent is
  // never reset by re-created component identities.
  const renderCtas = ({ inFinal = false, single = false }: { inFinal?: boolean; single?: boolean }) => (
    <div className="price-ctas">
      <button onClick={startCheckout} disabled={busy} className="jbtn green">{busy ? t.redirecting : (single ? t.ctaSingle : inFinal ? t.ctaFinal : t.ctaStart)}</button>
      {!single && <Link href="/signup?next=%2Fjoin" className="jbtn ghost">{inFinal ? t.ctaGhostFinal : t.ctaGhost}</Link>}
    </div>
  );

  return (
    <div className="joinp" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="jbgwrap"><div className="jgrid" /></div>

      {/* Hero */}
      <header className="hero">
        <div className="jwrap">
          <div className="eyebrow reveal"><span className="pulse" /> {t.eyebrow}</div>
          <h1 className="hero-title reveal">{t.titlePre}<em>{t.titleEm}</em></h1>
          <p className="hero-sub reveal">{t.sub}</p>
          <div className="price-card reveal">
            <div className="price-row"><span className="price-big">$1.92</span><span className="price-per">{t.perWeek}</span></div>
            <p className="price-foot">{t.footA}<b>{t.footB}</b>{t.footC}<span className="green">{t.footGreen}</span>.</p>
            <div className="price-coffee">{t.coffee}</div>
            {renderCtas({ single: true })}
            <p className="micro"><span className="mono">{t.micro}</span></p>
          </div>
          <div className="logos reveal">
            {t.logos.map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="block">
        <div className="jwrap">
          <div className="sec-head reveal">
            <span className="kicker">{t.featKicker}</span>
            <h2 className="sec-title">{t.featTitle}</h2>
            <p className="sec-sub">{t.featSub}</p>
          </div>
          <div className="feat-grid">
            <div className="feat featured reveal">
              <div className="fbody">
                <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M3 12h4l2 6 4-14 2 8h6" /></svg></span> {t.hcTag}</div>
                <p>{t.hcBody}</p>
              </div>
              <div className="hc-visual">
                <div className="hc-bar"><span style={{ width: 64 }}>{t.hcLabels[0]}</span><div className="track"><div className="fill red" data-w="78%" /></div></div>
                <div className="hc-bar"><span style={{ width: 64 }}>{t.hcLabels[1]}</span><div className="track"><div className="fill" data-w="71%" /></div></div>
                <div className="hc-bar"><span style={{ width: 64 }}>{t.hcLabels[2]}</span><div className="track"><div className="fill" data-w="88%" /></div></div>
                <div className="hc-bar"><span style={{ width: 64 }}>{t.hcLabels[3]}</span><div className="track"><div className="fill" data-w="46%" /></div></div>
                <div className="hc-grade"><span className="g">B+</span><small style={{ whiteSpace: "pre-line" }}>{t.hcSmall}</small></div>
              </div>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M12 3v18M5 9l7-6 7 6" /><circle cx="12" cy="15" r="3" /></svg></span> {t.f2Tag}</div>
              <p>{t.f2}</p>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M7 7h10v10M7 17 17 7" /></svg></span> {t.f3Tag}</div>
              <p>{t.f3}</p>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10" /></svg></span> {t.f4Tag}</div>
              <p>{t.f4}</p>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg></span> {t.f5Tag}</div>
              <p>{t.f5}</p>
            </div>
            <div className="feat reveal">
              <div className="ftag"><span className="ico"><svg viewBox="0 0 24 24"><path d="M3 20h18M7 20V9m5 11V4m5 16v-7" /></svg></span> {t.f6Tag}</div>
              <p>{t.f6}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="block">
        <div className="jwrap">
          <div className="sec-head reveal">
            <span className="kicker">{t.cmpKicker}</span>
            <h2 className="sec-title">{t.cmpTitle}</h2>
            <p className="sec-sub">{t.cmpSub}</p>
          </div>
          <div className="cmp reveal">
            <div className="cmp-row cmp-head"><div>{t.cmpService}</div><div>{t.cmpYear}</div><div>{t.cmpWeek}</div><div /></div>
            <div className="cmp-row us">
              <div className="svc"><span className="badge">{t.badge}</span> uncoverd Pro</div>
              <div className="yr">$100</div><div className="wk">$1.92 / wk</div><div className="chk chk-y">✓</div>
            </div>
            {COMPETITORS.map((c) => (
              <div className="cmp-row" key={c.name}>
                <div className="svc">{c.name}</div><div className="yr">{c.yr}</div><div className="wk">{c.wk}</div><div className="chk chk-n">✕</div>
              </div>
            ))}
          </div>
          <p className="cmp-note">{t.cmpNote}<br /><span className="save-pill">{t.savePill}</span></p>
        </div>
      </section>

      {/* Stats */}
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="jwrap">
          <div className="stats reveal">
            <div><div className="n">5</div><div className="l">{t.s1}</div></div>
            <div><div className="n" data-count="65000" data-suffix="+">0</div><div className="l">{t.s2}</div></div>
            <div><div className="n">{t.s3n}</div><div className="l">{t.s3}</div></div>
            <div><div className="n">∞</div><div className="l">{t.s4}</div></div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="block" style={{ paddingTop: 10 }}>
        <div className="jwrap">
          <div className="final reveal">
            <h2>{t.finalTitle}</h2>
            <p>{t.finalSub}</p>
            <div className="price-line">{t.finalJust} <span className="green">$1.92 {t.perWeek}</span> &nbsp;·&nbsp; <span className="muted">{t.finalBilled}</span></div>
            {renderCtas({ inFinal: true })}
          </div>
          <p className="disc">{t.disc}</p>
        </div>
      </section>
    </div>
  );
}
