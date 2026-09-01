# Season Intel checkout (Stripe)

Scaffold so checkout goes live the moment Simon pastes Vercel env vars. **Do not commit secrets.**

Public Québec zone pages and Ontario FMZ 12 / 16 / 17 / 18 stay **free**. Scout, trip planner, harvest JSON, ads, and GIS are out of scope.

## Vercel env vars (paste exactly)

| Name | What |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_…` or `sk_test_…`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_live_…` or `pk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |
| `STRIPE_PRICE_ID` | Price id for **CAD $29 / year** Season Intel membership (`price_…`) |

If **any** of the four is missing, `/en/season-intel` and `/fr/season-intel` stay waitlist-only (current behaviour). Checkout APIs return `503 { "error": "checkout_not_configured" }` and the site does not crash.

Optional existing vars used for success/cancel URLs: `SITE_ORIGIN` (defaults toward `https://www.outdoorintel.ca`).

## Stripe Dashboard

1. Create a **CAD** recurring **yearly** price at **$29**. Paste its `price_…` into `STRIPE_PRICE_ID`.
2. Webhook endpoint: `https://outdoorintel.ca/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Paste the endpoint’s `whsec_…` into `STRIPE_WEBHOOK_SECRET`

No card fields on Outdoor Intel pages — hosted Checkout only.

## Membership store

Supabase is already used for the newsletter. Run `db/season-intel-members.sql` in the same project so webhooks can upsert email + Stripe customer/subscription ids.

If that table is not created yet, handlers still:

- log the event (no email bodies)
- set a signed HttpOnly cookie (`oi_si_member`) after `/api/stripe/session` confirms a paid Checkout Session

A durable member directory and change-alert mailer are the follow-up once live keys exist. CASL: Season Intel emails must include an unsubscribe note pointing at **hello@outdoorintel.ca** (no public unsubscribe URL yet).

## Endpoints

| | |
|---|---|
| `GET` / `POST` `/api/stripe/checkout` | Status / create Checkout Session (`mode: subscription`) |
| `POST` `/api/stripe/webhook` | Signed Stripe events |
| `GET` / `POST` `/api/stripe/session` | Cookie member check / confirm `session_id` |

## Pages

- `/en/season-intel`, `/fr/season-intel` — waitlist default; CTA **Subscribe — $29 CAD/year** when keys exist
- `/en/season-intel/thanks`, `/fr/season-intel/thanks` — member perk v1 (alerts coming) + the same public regs
