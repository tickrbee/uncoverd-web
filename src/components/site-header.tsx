// Header shell. We intentionally do NOT read the auth cookie here: doing so
// opts every page that renders the header into dynamic rendering, which blocked
// CDN caching site-wide (the cause of our Vercel cost/crawl problems). The
// client header detects the session itself (getSession + onAuthStateChange),
// so logged-in users still see "Account" — just after a brief hydration swap
// rather than on the server.

import { SiteHeaderClient } from "@/components/site-header-client";

export function SiteHeader() {
  return <SiteHeaderClient initialUser={null} />;
}
