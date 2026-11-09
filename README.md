# CASA

CASA is an independent Angolan music charts, audience and editorial platform. Built with Next.js App Router, React, TypeScript and Supabase.

## Design system

- CASA Blue: `#214BEF`
- Signal Orange: `#F0522B`
- Warm Cream: `#EEEAE1`
- Black: `#111111`
- Display type: Neue Haas Grotesk or a close system sans-serif fallback
- Data type: IBM Plex Mono

The Top 20 uses individual compact song cards in a two-column desktop grid. Positions 21 to 200 use a compact ranked list. On mobile, the Top 20 cards stack into one column.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
npm run start
```

## CMS and content setup

- The CMS is available at `/admin/login` after configuring Supabase authentication.
- Run [`supabase/cms-expansion.sql`](./supabase/cms-expansion.sql) in the Supabase SQL Editor to enable homepage section controls, the About page, contact settings and advertising.
- Follow [`supabase/cms-setup.md`](./supabase/cms-setup.md) to configure contact email delivery through Resend.
- Copy `.env.example` to `.env.local` for local development. Never commit `.env.local`.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `RAPIDAPI_KEY`, `CASA_CRON_SECRET`, and `RESEND_API_KEY` server-only. Do not use the `NEXT_PUBLIC_` prefix for these values.
- Configure production secrets in Vercel Environment Variables and `CASA_CRON_SECRET` in Supabase Vault for the weekly monthly-listener job.

Chart and audience data are read from Supabase. Data sources are attributed on the public About page; CASA is an independent project and is not affiliated with Apple Music or Spotify.
