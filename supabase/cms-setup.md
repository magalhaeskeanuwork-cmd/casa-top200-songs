# CASA CMS setup

1. Run [`cms-expansion.sql`](./cms-expansion.sql) in the Supabase SQL Editor. It creates the homepage controls, selected homepage cards, Sobre/contact settings and advertising tables, plus the delete permissions used by the CMS.
2. In the app's server environment, set `RESEND_API_KEY` and `CASA_FROM_EMAIL` to a Resend API key and a sender address verified in Resend. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only; the contact API uses it to look up the configured recipient without exposing that address publicly.
3. Open `/admin/homepage` to add/order/hide homepage content, `/admin/sobre` to set the recipient email and contribution details, and `/admin/publicidade` to approve embeds and control their visibility.

The contact form returns an error until both Resend variables are configured. `CASA_FROM_EMAIL` should use a domain verified in Resend for production delivery.
