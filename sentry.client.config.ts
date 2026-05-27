// Sentry browser config. Only initialized when SENTRY_DSN is set, so local
// development without a DSN stays silent.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // Sanitize known false-positives so we don't burn the free quota on
    // browser-extension noise.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "Network request failed",
    ],
  });
}
