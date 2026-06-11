"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/use-locale";
import type { Locale } from "@/lib/i18n";

const ACCENT = "#15b87f";

// Conversion pages follow the site i18n pattern: SSR renders English (the
// canonical, cacheable HTML); real users get their chosen language applied on
// hydration via the locale cookie (useLocale).
const STR: Record<Locale, {
  kicker: string; title: string; sub: string;
  emailLabel: string; emailErr: string; digest: string;
  cta: string; busy: string; foot: string;
  proofs: [string, string, string];
}> = {
  en: {
    kicker: "Free access",
    title: "Get this month's top-rated dividend stocks",
    sub: "Drop your email and we'll take you straight to this month's #1-rated pick and the full A–F ranking — chosen by our 5-pillar model, not hand-picked.",
    emailLabel: "Enter your email address",
    emailErr: "Please enter a valid email.",
    digest: "Also send me the free weekly dividend digest — new ratings, ex-dates and ideas.",
    cta: "Continue →", busy: "One sec…",
    foot: "No card required · Unsubscribe anytime · We never sell your data.",
    proofs: ["✓ 65,000+ stocks rated A–F", "✓ Updated continuously", "✓ No spam"],
  },
  fr: {
    kicker: "Accès gratuit",
    title: "Découvrez les actions à dividende les mieux notées du mois",
    sub: "Laissez votre e-mail et accédez directement au choix n°1 du mois et au classement A–F complet — sélectionné par notre modèle à 5 piliers, pas à la main.",
    emailLabel: "Votre adresse e-mail",
    emailErr: "Veuillez saisir un e-mail valide.",
    digest: "Recevoir aussi le digest dividendes hebdomadaire gratuit — nouvelles notes, ex-dates et idées.",
    cta: "Continuer →", busy: "Un instant…",
    foot: "Sans carte bancaire · Désinscription à tout moment · Vos données ne sont jamais revendues.",
    proofs: ["✓ Plus de 65 000 titres notés A–F", "✓ Mise à jour continue", "✓ Zéro spam"],
  },
  de: {
    kicker: "Kostenloser Zugang",
    title: "Die bestbewerteten Dividendenaktien des Monats",
    sub: "E-Mail eintragen und direkt zum Nr.-1-Pick des Monats samt vollständigem A–F-Ranking — ausgewählt von unserem 5-Säulen-Modell, nicht von Hand.",
    emailLabel: "Deine E-Mail-Adresse",
    emailErr: "Bitte eine gültige E-Mail eingeben.",
    digest: "Auch den kostenlosen wöchentlichen Dividenden-Digest senden — neue Ratings, Ex-Termine und Ideen.",
    cta: "Weiter →", busy: "Einen Moment…",
    foot: "Keine Karte nötig · Jederzeit abbestellbar · Deine Daten werden nie verkauft.",
    proofs: ["✓ Über 65.000 Titel mit A–F bewertet", "✓ Laufend aktualisiert", "✓ Kein Spam"],
  },
  es: {
    kicker: "Acceso gratuito",
    title: "Las acciones de dividendo mejor valoradas del mes",
    sub: "Deja tu correo y ve directo a la elección nº1 del mes y al ranking A–F completo — seleccionado por nuestro modelo de 5 pilares, no a mano.",
    emailLabel: "Tu correo electrónico",
    emailErr: "Introduce un correo válido.",
    digest: "Enviarme también el resumen semanal gratuito de dividendos — nuevas calificaciones, ex-dates e ideas.",
    cta: "Continuar →", busy: "Un segundo…",
    foot: "Sin tarjeta · Date de baja cuando quieras · Nunca vendemos tus datos.",
    proofs: ["✓ Más de 65.000 valores calificados A–F", "✓ Actualización continua", "✓ Sin spam"],
  },
  it: {
    kicker: "Accesso gratuito",
    title: "Le azioni a dividendo meglio valutate del mese",
    sub: "Lascia la tua e-mail e vai dritto alla scelta n.1 del mese e alla classifica A–F completa — selezionata dal nostro modello a 5 pilastri, non a mano.",
    emailLabel: "Il tuo indirizzo e-mail",
    emailErr: "Inserisci un'e-mail valida.",
    digest: "Inviami anche il digest settimanale gratuito sui dividendi — nuove valutazioni, ex-date e idee.",
    cta: "Continua →", busy: "Un attimo…",
    foot: "Nessuna carta richiesta · Disiscrizione in qualsiasi momento · Non vendiamo mai i tuoi dati.",
    proofs: ["✓ Oltre 65.000 titoli valutati A–F", "✓ Aggiornamento continuo", "✓ Niente spam"],
  },
};

export function UnlockView() {
  const t = STR[useLocale()];
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setErr(t.emailErr); return; }
    setBusy(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source: "unlock" }),
      });
    } catch { /* don't block the funnel on a capture error */ }
    router.push("/join");
  }

  return (
    <section className="dv-section" style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", paddingTop: 16 }}>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: ACCENT, marginBottom: 14 }}>
        {t.kicker}
      </div>
      <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 14px", lineHeight: 1.12 }}>
        {t.title}
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1.02rem", lineHeight: 1.6, margin: "0 auto 26px", maxWidth: 480 }}>
        {t.sub}
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 440, margin: "0 auto", width: "100%" }}>
        <label htmlFor="lead-email" style={{ fontWeight: 700, textAlign: "left", fontSize: "0.92rem" }}>{t.emailLabel}</label>
        <input
          id="lead-email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${err ? "#e0556b" : "var(--border-subtle, #2a3a50)"}`, background: "var(--surface, rgba(255,255,255,0.03))", color: "var(--text, #e8eef6)", fontSize: "1rem", outline: "none" }}
        />
        {err && <span style={{ color: "#e0556b", fontSize: "0.85rem", textAlign: "left" }}>{err}</span>}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "left" }}>
          <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
          {t.digest}
        </label>
        <button type="submit" disabled={busy} className="btn" style={{ background: ACCENT, borderColor: ACCENT, color: "#04140d", fontWeight: 800, fontSize: "1.02rem", padding: "14px", borderRadius: 12, cursor: busy ? "default" : "pointer", marginTop: 4 }}>
          {busy ? t.busy : t.cta}
        </button>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>{t.foot}</span>
      </form>
      <div style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 28 }}>
        {t.proofs.map((p) => <span key={p}>{p}</span>)}
      </div>
    </section>
  );
}
