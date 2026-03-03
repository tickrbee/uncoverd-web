import Link from "next/link";
import { APP_NAME } from "@/lib/branding";

export function MainNav() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand-mark" aria-label="uncoverd homepage">
          <span className="brand-mark__dot" />
          <span>{APP_NAME}</span>
        </Link>

        <nav className="main-nav" aria-label="Main">
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Login</Link>
          <Link href="/account">Account</Link>
        </nav>
      </div>
    </header>
  );
}
