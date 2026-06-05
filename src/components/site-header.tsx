// Header shell. Kept client-only: reading the auth cookie here (cookies()) on
// ISR routes like /stocks/[ticker] (which export `revalidate`) 500s at runtime
// — the build doesn't catch it. The client header detects the session itself.
// The logged-in/sign-out reliability fix must therefore live client-side (e.g.
// a small /api auth-state fetch), NOT a server cookie read in this component.

import { SiteHeaderClient } from "@/components/site-header-client";

export function SiteHeader() {
  return <SiteHeaderClient initialUser={null} />;
}
