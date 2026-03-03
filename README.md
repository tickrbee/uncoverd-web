# uncoverd-web

Production website for `uncoverd.org` built with Next.js (App Router), Supabase Auth, and Stripe-backed billing flows.

## Features

- Landing page (`/`)
- Login (`/login`) with:
  - Email magic link
  - Google OAuth
- Pricing (`/pricing`) with public plans: Free / Plus / Pro
- Account (`/account`) protected by middleware and Supabase session refresh
- Legal pages (`/legal/terms`, `/legal/privacy`)
- Auth callback route (`/auth/callback`)

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Example local values are in `.env.example`.

Note: the app includes fallback values for Supabase URL and publishable anon key so deployments do not crash if those two vars are temporarily missing. Vercel env vars are still recommended for explicit configuration.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Billing Integration Notes

This frontend calls Supabase Edge Functions directly:

- `create-checkout-session`
- `create-customer-portal-session`

The user-facing plan map is:

- `Free` -> `free`
- `Plus` -> `plus`
- `Pro` -> `gold`

## Deployment (Vercel)

1. Import this repo into Vercel.
2. Set the three environment variables for Production and Preview.
3. Add domains:
   - `uncoverd.org`
   - `www.uncoverd.org` (redirect to apex)
4. In Supabase Auth settings, configure:
   - Site URL: `https://uncoverd.org`
   - Redirect URLs for local + preview + production callback paths.
