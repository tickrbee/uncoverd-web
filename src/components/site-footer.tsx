// Footer shell. Like the header, it no longer reads the auth cookie on the
// server (that would block CDN caching). The signed-in/out link is resolved
// client-side via FooterAuthLink.

import Link from "next/link";
import { FooterAuthLink } from "@/components/footer-auth-link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__links">
          <Link href="/stocks">Browse Stocks A–Z</Link>
          <Link href="/etfs">Browse ETFs A–Z</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/about">About</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/glossary">Glossary</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy Policy</Link>
          <Link href="/legal/disclaimer">Investment Disclaimer</Link>
          <FooterAuthLink />
        </div>

        {/* Localized hubs — kept as a separate row so crawlers reach the
            non-English service pages (they have no English equivalent). */}
        <div className="site-footer__links site-footer__links--intl">
          <Link href="/fr/calendrier-dividendes" hrefLang="fr-FR" lang="fr">
            Calendrier dividendes 🇫🇷
          </Link>
          <Link href="/de/dividendenkalender" hrefLang="de-DE" lang="de">
            Dividendenkalender 🇩🇪
          </Link>
          <Link href="/es/proximos-dividendos" hrefLang="es-ES" lang="es">
            Próximos dividendos 🇪🇸
          </Link>
        </div>

        <div className="site-footer__social">
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link social-link--instagram"
            aria-label="Instagram"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient-footer)" />
              <circle cx="12" cy="12" r="4" fill="white" />
              <circle cx="17" cy="7" r="1.5" fill="white" />
              <defs>
                <linearGradient id="instagram-gradient-footer" x1="2" y1="2" x2="22" y2="22">
                  <stop offset="0%" stopColor="#833AB4" />
                  <stop offset="50%" stopColor="#FD1D1D" />
                  <stop offset="100%" stopColor="#FCAF45" />
                </linearGradient>
              </defs>
            </svg>
          </a>
          <a
            href="https://x.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link social-link--twitter"
            aria-label="X (Twitter)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link social-link--linkedin"
            aria-label="LinkedIn"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M8 9v8M8 7v.01M16 9v6a2 2 0 01-2 2h-2M12 9v8" stroke="#0077B5" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </a>
          <a
            href="https://www.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link social-link--facebook"
            aria-label="Facebook"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
