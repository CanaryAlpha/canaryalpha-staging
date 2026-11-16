# Accounts and payments: setup, testing and go-live

How canaryalpha.co's accounts (Clerk) and payments (Stripe) are wired, how to
test them in Stripe TEST mode, and the exact steps to turn on paid plans for
real. Item 404 in the research checklist.

**Paid plans go live only after the company, EIN and bank account exist
(checklist items 129 to 131).** Until then Stripe stays in TEST mode and the
switch stays off.

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| Static pages | this repo, served by Vercel | the site; members' pages are shells with no paid content |
| `middleware.js` | Vercel Routing Middleware | `/dashboard/*` and `/account/*` need a Clerk session, or go to `/login/?next=` |
| `api/` | Vercel Functions (Node) | everything that needs a login or a plan; each one checks the Clerk session itself |
| Clerk | dev instance (previews), production instance (canaryalpha.co) | sign up, log in, log out, password reset, email codes, profile, account deletion |
| Stripe | sandbox "Canary Alpha 404" now; live mode at go-live | Checkout, the customer portal, webhooks |
| Research API | `api.canaryalpha.co` (Fly, repo canaryalpha-api) | the reports; paid views need a 5-minute token minted by `api/_lib/research.js` |

There is no database. Stripe is the record of what was paid. After every
webhook, and when the account page comes back from Stripe, the server reads
the customer back from Stripe and writes the plan to the Clerk user
(`publicMetadata.billing`). The plan rules are in `api/_lib/plans.js`:

- **Pro** or **Enterprise**: the plan of the member's subscription (from its
  price's lookup key) while it is `active`, `trialing` or `past_due` and the
  paid period hasn't ended (plus 3 days' grace for a late webhook). A member
  has one subscription; changing plan changes its price (customer portal).
  Enterprise ranks above Pro.
- **Bespoke reports** (Enterprise): 3 per billing month, monthly and yearly
  plans alike (a yearly plan's months run from its start date). Unused ones
  don't carry over. Each request is a $0 invoice on the customer
  ("Bespoke report: <token> (included in your Enterprise plan)",
  `metadata.ca_kind = bespoke_report`); the month's count is read back from
  those invoices. Customers on a Stripe test clock count in the clock's time.
- **Free** otherwise. Free members read the reports the API marks free (BTC
  and ETH today).

Enterprise reads the research API's `institutional` view, Pro its `pro` view.

## The paid-plans switch

One variable on the Vercel project: **`PAID_PLANS_ENABLED`**.

- Anything but `true` (the default): `/api/billing/checkout` refuses with
  403, and every Pro and Enterprise button on the site says "Coming soon.
  Join the list" and leads to `/waitlist/` (the Formspree waitlist).
- `true`: the buttons become "Go Pro" / "Order a report" and lead to the
  account page, which starts Stripe Checkout.

The pages learn it from `/api/config`, so a variable change needs a new
deployment (Vercel → Deployments → the latest production one → ⋯ →
Redeploy). The billing portal works either way, so anyone who has paid can
always cancel.

## Environment variables (Vercel → Settings → Environment Variables)

Names only; never put a value in this repo.

| Name | Preview | Production |
|---|---|---|
| `CLERK_PUBLISHABLE_KEY` | Clerk dev instance `pk_test_…` | Clerk production `pk_live_…` |
| `CLERK_SECRET_KEY` | Clerk dev `sk_test_…` | Clerk production `sk_live_…` |
| `STRIPE_SECRET_KEY` | sandbox `sk_test_…` | sandbox `sk_test_…` until go-live, then live `sk_live_…` (or a restricted `rk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | the preview endpoint's `whsec_…` | the production endpoint's `whsec_…` |
| `ENTITLEMENT_SECRET` | same value as on Fly | same value as on Fly |
| `CLERK_WEBHOOK_SIGNING_SECRET` | the dev instance's endpoint `whsec_…` | the production instance's endpoint `whsec_…` |
| `PAID_PLANS_ENABLED` | `true` (to test) | `false` until go-live |
| `API_BASE` | optional; default `https://api.canaryalpha.co` | optional |

## Stripe objects (found by lookup key, so test and live use the same code)

| Lookup key | Product | Price |
|---|---|---|
| `pro_monthly` | Canary Alpha Pro | $30.00 / month, recurring |
| `pro_yearly` | Canary Alpha Pro | $288.00 / year, recurring |
| `enterprise_monthly` | Canary Alpha Enterprise | $1,000.00 / month, recurring (from 2026-11-03; replaces $300.00: archive that price, see "Changing a price") |
| `enterprise_yearly` | Canary Alpha Enterprise | $8,400.00 / year, recurring (from 2026-11-03; replaces $2,700.00: archive that price, see "Changing a price") |
| `enterprise_report` | Canary Alpha custom report | $300.00, one time. **Archived** 2026-11-02 when Enterprise became a subscription; older orders still show in the tracker |

Products carry `metadata.ca_plan`. Checkout sessions and payments carry
`metadata.clerk_user_id` and `ca_plan`; customers carry `clerk_user_id`.

Seller of record: Canary Alpha, not Stripe. New Stripe accounts have
Managed Payments (Stripe as merchant of record) on by default, which refuses
any checkout whose product lacks a tax code; `api/billing/checkout.js` sends
`managed_payments[enabled]=false` on every session (decided 2026-11-01).
Sales tax is ours to handle (Stripe Tax can be added later).

Customer portal (default configuration): cancel at the end of the period;
switch plan between Pro monthly/yearly and Enterprise monthly/yearly
(quantity fixed at 1); proration "always invoice": a move up (Pro to
Enterprise, monthly to yearly) charges the prorated difference at once and
keeps the renewal date unless the interval changes, and a move down
(Enterprise to Pro, yearly to monthly) waits for the period end
("schedule at period end": decreasing amount, shortening interval). Update
the card, invoice history, update email and address. Return link:
`https://canaryalpha.co/account/`. A Pro member's "Upgrade to Enterprise" on
the account page opens the portal straight on the confirmation page for that
price (`api/billing/portal.js`, flow `subscription_update_confirm`).

Webhook endpoint `https://<site>/api/stripe/webhook/` (with the final slash: vercel.json's `trailingSlash` redirects without it, and webhooks don't follow redirects), events:
`checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.paid`, `invoice.payment_failed`, `charge.refunded`.

Clerk webhook (Clerk dashboard → Webhooks, each instance): endpoint
`https://<site>/api/clerk/webhook/`, event `user.deleted`. When a member
deletes their account it cancels their Stripe subscriptions at once, so they
are never charged again.

Bespoke-report progress: `node tools/report-status.mjs list` lists the
orders (number, date, stage, ETA, token, notes); `node tools/report-status.mjs
CR-XXXXXXXX writing` moves one on (it writes the order's metadata in Stripe:
the request's $0 invoice, or an older custom report's payment). The member's
Enterprise dashboard shows it within 30 seconds.

## End-to-end test in TEST mode (run on a preview, then on production before go-live)

Preview deployments are behind Vercel Authentication; scripts and the Stripe
webhook reach them with the project's Protection Bypass for Automation.
Card numbers are Stripe's published test cards.

1. **Sign up**: `/signup/`, tick the consent box, sign up with a new email,
   enter the emailed code. Lands on `/dashboard/`; the menu shows Dashboard
   and the account initial. Clerk user has `unsafeMetadata.termsAgreedAt`.
2. **Free access**: BTC and ETH open in full; every other report shows its
   public summary and "The full report is part of Pro". `/api/research/report/?slug=dot`
   with this session returns `locked: true`.
3. **Logged out**: in a private window, `/dashboard/` and `/account/` redirect
   to `/login/?next=…`; `/api/me` and `/api/research/report/?slug=btc` return 401.
4. **Log out / log in**: Log out from the menu; log back in; `?next=` returns
   to the page asked for.
5. **Password reset**: `/login/` → Forgot password? → code by email → new
   password → logged in.
6. **Pro monthly**: account page → "Pro monthly, $30" → card `4242 4242 4242 4242`,
   any future date, any CVC → back on the account page: "Pro (monthly):
   renews on …". `dot` now opens in full (`degraded: false`).
7. **Switch to yearly** in Manage billing; the account page shows yearly.
8. **Cancel** in Manage billing: "cancelled. You keep Pro until …"; still Pro.
   Then end it now (Stripe dashboard → subscription → Cancel immediately):
   back to Free within seconds of the webhook.
9. **Failed renewal**: new Pro subscription with `4000 0000 0000 0341`
   (attaches, then fails), or advance a test clock: status `past_due`,
   the account page asks to update the card.
10. **Enterprise**: "Enterprise monthly, $1,000" on the account page (and,
    separately, yearly): Enterprise until the renewal date. The Enterprise
    dashboard shows "3 of 3 reports left this month" and the reset date.
    Request a report (token + notes): its card appears "In progress" and the
    count drops; after 3 the form is replaced by when the allowance resets.
    Report pages offer "Full research data (JSON)".
11. **Pro → Enterprise**: as a Pro member, "Upgrade to Enterprise": the portal
    shows the prorated amount; confirm, and the account page shows
    Enterprise. Monthly ↔ yearly and cancel work in Manage billing as for
    Pro. A test clock advanced past the billing month gives 3 reports again.
12. **Switch off**: with `PAID_PLANS_ENABLED` unset, `POST /api/billing/checkout/`
    returns 403 `paid_plans_closed` and every paid button says "Coming soon.
    Join the list".
13. **Webhook replay**: `stripe events resend <evt_id>` for an old event changes
    nothing (the result is recomputed, not added).

`npm test` runs the plan rules and the token format offline.

## Changing a price (Enterprise to $1,000 / $8,400, 2026-11-03)

Stripe prices can't be edited. The site finds prices by lookup key
(`api/_lib/billing.js`, `priceFor`), so a price change needs no code: create
the new price with the same lookup key and `transfer_lookup_key=true` (Stripe
moves the key off the old price), then archive the old price. Nothing is
deleted. TEST mode first (`stripe login`, no `--live`):

1. Find the Enterprise product and the current prices:
   ```bash
   stripe get /v1/prices -d "lookup_keys[]=enterprise_monthly" -d "lookup_keys[]=enterprise_yearly"
   ```
   Note each price's `id` and its `product` (`prod_…`).
2. Create the new prices, moving the lookup keys (replace `<prod>`):
   ```bash
   stripe prices create --product <prod> --currency usd --unit-amount 100000 -d "recurring[interval]=month" -d "lookup_key=enterprise_monthly" -d "transfer_lookup_key=true" -d "metadata[ca_plan]=enterprise"
   stripe prices create --product <prod> --currency usd --unit-amount 840000 -d "recurring[interval]=year" -d "lookup_key=enterprise_yearly" -d "transfer_lookup_key=true" -d "metadata[ca_plan]=enterprise"
   ```
3. Check: step 1's command now lists the two new prices ($1,000.00 and
   $8,400.00) and nothing else.
4. Archive the old prices (use the ids from step 1):
   ```bash
   stripe prices update <old $300 price id> -d "active=false"
   stripe prices update <old $2,700 price id> -d "active=false"
   ```
5. Customer portal (Dashboard, TEST mode: Settings → Billing → Customer
   portal → Subscriptions → products customers can switch between): for
   Canary Alpha Enterprise, select the two new prices and remove the old
   ones. Save.
6. Existing subscribers keep the old price until moved; nobody is moved
   automatically. To move one: Dashboard → the subscription → Update
   subscription → change the price to the new one (choose the proration).
   Paid plans aren't open yet, so in TEST mode there is normally no one to
   move.
7. Run test step 10 and 11 above (checkout and Pro → Enterprise upgrade)
   and check the amounts.

For live mode, repeat steps 1–7 with `--live` added to each command (and the
live Dashboard) only when going live; the Go-live commands below already
create the new amounts.

**Done in TEST mode, 2026-11-03** (sandbox "Canary Alpha 404",
`acct_1UW9l54EnXS06W2y`; done and checked by the owner with the Stripe CLI;
live mode not touched):

| What | Id | State |
|---|---|---|
| Canary Alpha Enterprise (the product the site uses) | `prod_VYNPhdAh7CrtOu` | active |
| Enterprise $1,000.00 / month, lookup key `enterprise_monthly`, `ca_plan` enterprise | `price_1UXofT4EnXS06W2yx55XFXsn` | active |
| Enterprise $8,400.00 / year, lookup key `enterprise_yearly`, `ca_plan` enterprise | `price_1UXofs4EnXS06W2ypI6d2jNW` | active |
| Old Enterprise $300.00 / month | `price_1UXGfB4EnXS06W2y8q20BXuo` | archived, no lookup key |
| Old Enterprise $2,700.00 / year | `price_1UXGfG4EnXS06W2yWGRrTct1` | archived, no lookup key |
| Two earlier $1,000 / $8,400 prices on `prod_VYNPhdAh7CrtOu` (replaced by the two above) | `price_1UXoY64EnXS06W2yt0syOT7I`, `price_1UXoYF4EnXS06W2yiBFIqHSY` | archived |
| Duplicate product "Canary Alpha Enterprise", made in the Dashboard by mistake (no lookup keys; was the one in the portal) | `prod_VYwIhF90muayyQ` | archived, with its prices `price_1UXoPh4EnXS06W2y0Z4cABOQ`, `price_1UXoQP4EnXS06W2yE2hUeGmC` |
| Customer portal (default configuration) | `bpc_1UW9rX4EnXS06W2yquXLEYxL` | lists Pro `prod_VXEKFm2O8OWWCE` (unchanged) and Enterprise `prod_VYNPhdAh7CrtOu` with the two new prices; adjustable quantity off for both |

Lessons: make prices on the existing product with the CLI commands above, not
a new product in the Dashboard (a second product with the same name gets no
lookup keys, and the portal can end up pointing at it); and after any price
change, check the portal with
`stripe get /v1/billing_portal/configurations/<bpc_…> -d "expand[]=features.subscription_update.products"`
(the plain list doesn't show which prices the portal offers). Also check the
product itself is still active (`stripe products retrieve <prod_…>`, look for
`"active": true`): an archived product blocks Checkout for all of its prices,
even active ones ("Price … is not available to be purchased because its
product is not active", seen in the Vercel logs as a 500 on
`/api/billing/checkout`; the member only sees "Something went wrong").
`prod_VYNPhdAh7CrtOu` was archived by mistake during this clean-up and
reactivated on 2026-11-04 with
`stripe products update prod_VYNPhdAh7CrtOu -d active=true`.

**Tested on the `enterprise-pricing` preview, 2026-11-04** (TEST mode, by the
owner): Checkout for Enterprise monthly showed $1,000.00 / month and the
account page and Enterprise dashboard (3 of 3 reports, reset date) updated;
in Stripe the subscription was on `price_1UXofT4EnXS06W2yx55XFXsn` with a paid
$1,000.00 invoice, and webhook deliveries returned 200. The portal offered
Pro and Enterprise yearly with no quantity field; monthly to yearly charged
$7,400 (prorated) and moved the renewal to a year out; cancelling kept
Enterprise until the period end. A Pro monthly member upgrading to
Enterprise monthly paid $970 (prorated) and became Enterprise (monthly).

## Go-live: switching Stripe to live mode

Only after items 129–131 are done (LLC, EIN, bank account; all three closed
by 2026-11-14), and after the test above passes on production in TEST mode.
Steps 1–6 are the owner's: they need the live Stripe account and the Vercel
dashboard. **No secret goes into this repo, a commit, a chat or a log:** keys
and signing secrets are copied in the Stripe dashboard and pasted straight
into Vercel.

1. **Activate the Stripe account** (live mode; done by the owner
   2026-11-14: Canary Alpha Research LLC, bank account connected, automatic
   payouts). Then, in live mode:
   - Settings → Business → Public details: public business name
     `Canary Alpha Research LLC` (Checkout and receipts show it as the
     seller), statement descriptor `CANARY ALPHA RESEARCH` (card
     statements show it in capitals), support email hello@canaryalpha.co,
     website https://canaryalpha.co, Terms https://canaryalpha.co/terms/
     and Privacy https://canaryalpha.co/privacy/.
   - Settings → Customer emails: email receipts for successful payments and
     refunds on.
   - Settings → Managed Payments: leave it off. Checkout also turns it off
     per session, so a live checkout must open with Canary Alpha Research
     LLC, not Stripe, as the seller (step 7 confirms).
2. **Create the live products, prices, portal and webhook** with the Stripe
   CLI. First `stripe switch` and pick the **Canary Alpha Research LLC**
   account, not the "Canary Alpha 404" sandbox the CLI used for TEST mode
   (if it isn't listed, `stripe login` and pick it there). While the CLI is
   on the sandbox, every `--live` command is refused with "You're in a
   sandbox" and creates nothing (seen 2026-11-14). Check before creating
   anything: `stripe products list --live --limit 5 | jq '.data[] | {id, name}'`
   runs without that message (and, the first time, lists no Canary Alpha
   products).
   Every command below has `--live`; the ids it prints (`prod_…`,
   `price_…`, `bpc_…`, `we_…`) are not secrets. Paste the whole block in one
   Terminal window so the variables carry over (`jq` is installed):
   ```bash
   PRO=$(stripe products create --live --name "Canary Alpha Pro" -d "metadata[ca_plan]=pro" | jq -r .id)
   PRO_M=$(stripe prices create --live --product "$PRO" --currency usd --unit-amount 3000 -d "recurring[interval]=month" -d "lookup_key=pro_monthly" -d "metadata[ca_plan]=pro" | jq -r .id)
   PRO_Y=$(stripe prices create --live --product "$PRO" --currency usd --unit-amount 28800 -d "recurring[interval]=year" -d "lookup_key=pro_yearly" -d "metadata[ca_plan]=pro" | jq -r .id)
   ENT=$(stripe products create --live --name "Canary Alpha Enterprise" -d "metadata[ca_plan]=enterprise" | jq -r .id)
   ENT_M=$(stripe prices create --live --product "$ENT" --currency usd --unit-amount 100000 -d "recurring[interval]=month" -d "lookup_key=enterprise_monthly" -d "metadata[ca_plan]=enterprise" | jq -r .id)
   ENT_Y=$(stripe prices create --live --product "$ENT" --currency usd --unit-amount 840000 -d "recurring[interval]=year" -d "lookup_key=enterprise_yearly" -d "metadata[ca_plan]=enterprise" | jq -r .id)
   echo "$PRO $PRO_M $PRO_Y $ENT $ENT_M $ENT_Y"
   ```
   Check: six ids, none of them `null`. Then this lists exactly the four
   prices ($30.00/month, $288.00/year, $1,000.00/month, $8,400.00/year),
   each with its lookup key and `ca_plan`:
   ```bash
   stripe prices list --live -d "lookup_keys[]=pro_monthly" -d "lookup_keys[]=pro_yearly" -d "lookup_keys[]=enterprise_monthly" -d "lookup_keys[]=enterprise_yearly" | jq '.data[] | {lookup_key, unit_amount, interval: .recurring.interval, product, ca_plan: .metadata.ca_plan, active}'
   ```
   **Customer portal.** The site opens Stripe's *default* portal
   configuration, so update that one (do not create a second):
   ```bash
   BPC=$(stripe billing_portal configurations list --live -d is_default=true | jq -r '.data[0].id'); echo "$BPC"
   ```
   If that prints `null`, open the live Dashboard → Settings → Billing →
   Customer portal, click Save once (it creates the default), and run it
   again. Then copy the TEST portal's settings onto it (Pro and Enterprise,
   monthly↔yearly, cancel at period end, price changes only, so adjustable
   quantity is off):
   ```bash
   stripe billing_portal configurations update "$BPC" --live \
     -d "business_profile[headline]=Canary Alpha Research: manage your plan" \
     -d "business_profile[privacy_policy_url]=https://canaryalpha.co/privacy/" \
     -d "business_profile[terms_of_service_url]=https://canaryalpha.co/terms/" \
     -d "default_return_url=https://canaryalpha.co/account/" \
     -d "features[customer_update][enabled]=true" \
     -d "features[customer_update][allowed_updates][]=email" \
     -d "features[customer_update][allowed_updates][]=address" \
     -d "features[invoice_history][enabled]=true" \
     -d "features[payment_method_update][enabled]=true" \
     -d "features[subscription_cancel][enabled]=true" \
     -d "features[subscription_cancel][mode]=at_period_end" \
     -d "features[subscription_cancel][proration_behavior]=none" \
     -d "features[subscription_pause][enabled]=false" \
     -d "features[subscription_update][enabled]=true" \
     -d "features[subscription_update][default_allowed_updates][]=price" \
     -d "features[subscription_update][proration_behavior]=always_invoice" \
     -d "features[subscription_update][schedule_at_period_end][conditions][0][type]=decreasing_item_amount" \
     -d "features[subscription_update][schedule_at_period_end][conditions][1][type]=shortening_interval" \
     -d "features[subscription_update][products][0][product]=$PRO" \
     -d "features[subscription_update][products][0][prices][]=$PRO_M" \
     -d "features[subscription_update][products][0][prices][]=$PRO_Y" \
     -d "features[subscription_update][products][1][product]=$ENT" \
     -d "features[subscription_update][products][1][prices][]=$ENT_M" \
     -d "features[subscription_update][products][1][prices][]=$ENT_Y" \
     | jq '{id, error: .error.message}'
   ```
   The update's reply leaves out the product list unless it is expanded
   (seen 2026-11-14: a filter that read it failed with "Cannot iterate over
   null"), so check it by reading the configuration back:
   ```bash
   stripe get "/v1/billing_portal/configurations/$BPC" --live -d "expand[]=features.subscription_update.products" | jq '{id, error: .error.message, is_default, livemode, default_return_url, cancel: .features.subscription_cancel.mode, updates: .features.subscription_update.default_allowed_updates, products: ((.features.subscription_update.products | if type == "object" then .data else . end) // [] | map({product, prices}))}'
   ```
   Check: `error: null`, `is_default: true`, `livemode: true`,
   `cancel: "at_period_end"`, `updates: ["price"]` (no `quantity`), and both
   products with two prices each.

   **Webhook.** With the final slash (`vercel.json`'s `trailingSlash`
   redirects `/api/stripe/webhook` without it, and Stripe does not follow
   redirects), the seven events the code handles, and the API version
   stripe-node 23.0.0 is pinned to. The `jq` at the end keeps the signing
   secret off the screen; it is copied from the Dashboard in step 3:
   ```bash
   stripe webhook_endpoints create --live \
     -d "url=https://canaryalpha.co/api/stripe/webhook/" \
     -d "api_version=2026-09-30.endive" \
     -d "description=canaryalpha.co production (live)" \
     -d "enabled_events[]=checkout.session.completed" \
     -d "enabled_events[]=customer.subscription.created" \
     -d "enabled_events[]=customer.subscription.updated" \
     -d "enabled_events[]=customer.subscription.deleted" \
     -d "enabled_events[]=invoice.paid" \
     -d "enabled_events[]=invoice.payment_failed" \
     -d "enabled_events[]=charge.refunded" \
     | jq '{id, url, status, api_version, livemode, enabled_events}'
   ```
   If the CLI refuses a live write ("permission" or "restricted key"),
   make that object in the live Dashboard instead with the same values
   (a price's lookup key is under "Advanced" when adding the price; its
   metadata under "Metadata").
3. **Vercel Production variables** (vercel.com → the `canary-alpha` team →
   project `canary-alpha-research-live` → Settings → Environment Variables).
   Production only; Preview keeps the TEST values.
   - **Copy the live secret key**: Stripe Dashboard, account switcher
     (top left) on Canary Alpha Research LLC, not the sandbox, test mode
     off → Developers → API keys → Secret key → Reveal live key (Stripe may
     ask you to sign in again) → Copy. If Stripe won't reveal it again,
     use Create secret key, name it `vercel-production`, and copy it when
     it is shown.
   - In Vercel, find `STRIPE_SECRET_KEY`. If its row lists **Production and
     Preview together**, click ⋯ → Edit, untick Production, Save (Preview
     keeps the test key); then Add New (top right) → Key
     `STRIPE_SECRET_KEY`, paste the live key as the Value, Environments:
     **Production only**, Sensitive on → Save. If the row is already
     Production only: ⋯ → Edit → paste over the value → Save.
   - **Copy the live webhook signing secret**: Stripe Dashboard (live) →
     Developers → Webhooks → the `https://canaryalpha.co/api/stripe/webhook/`
     endpoint → Signing secret → Reveal → Copy.
   - In Vercel, do the same for `STRIPE_WEBHOOK_SECRET` (Production only,
     Sensitive on).
   - Leave `PAID_PLANS_ENABLED` at `false` in Production for now.
   - Deployments → the latest Production deployment → ⋯ → Redeploy.
   - Clear the clipboard (copy any other text) when done.
4. **Smoke test, still switched off**: `/api/config` says `paidPlans: false`;
   `POST /api/billing/checkout/` is refused with 403 `paid_plans_closed`.
5. **Turn it on**: Vercel → Environment Variables → `PAID_PLANS_ENABLED` →
   ⋯ → Edit → Value `true`, Environments **Production only** (if the row
   also covers Preview or Development, untick them first and add a separate
   Production-only `true`) → Save. The value takes effect with the next
   deployment, which is the merge of the `go-live` branch (the "Go Pro" /
   "Go Enterprise" wording and the Terms change in step 8). Without that
   merge: Deployments → latest Production → ⋯ → Redeploy.
6. **Clean up TEST**: in the "Canary Alpha 404" sandbox, disable the
   webhook endpoint for `https://canaryalpha.co/api/stripe/webhook/`
   (Developers → Webhooks → ⋯ → Disable). Production now checks the live
   signing secret, so sandbox deliveries to it would fail with 400. The
   preview endpoint stays.
7. **One real purchase** on your own account: Pro monthly ($30, the lowest
   price). Check the account page ("Pro (monthly): renews on …"), a Pro
   report opening in full, Manage billing (the portal offers Pro yearly and
   Enterprise, cancel at period end, no quantity), the payment in the
   Stripe live dashboard (seller Canary Alpha Research LLC, descriptor
   `CANARY ALPHA RESEARCH`), and the webhook deliveries (200). Then in
   Stripe: the subscription → Cancel immediately, and the payment → Refund
   in full. The account page returns to Free and the `charge.refunded`
   delivery is 200.
8. **Terms**: "Pro and Enterprise are not on sale yet" comes out of Terms
   section 4 (done on the `go-live` branch, 2026-11-14, for the owner's
   review).

   **Decisions recorded 2026-11-14 (the owner):** launched 2026-11 without
   attorney review by operator decision (cost); review deferred until funds
   allow (items 133–135 stay part-closed, with that note). The Terms change
   above is kept for launch. "Canary Alpha Research LLC, a Delaware limited
   liability company" in the Terms and Privacy is confirmed correct and
   stays as written.
9. **Record it** on checklist item 404.

**Roll back**: set `PAID_PLANS_ENABLED` back to `false` and redeploy. Paid
members keep their plan (the plan comes from Stripe, not the switch) and can
still reach the billing portal.

## Refunds and support (operator)

- Yearly refund within 30 days (Terms section 6): refund in Stripe **and**
  cancel the subscription immediately; the webhook then drops the member to
  Free.
- A member who paid but shows Free: Stripe → Developers → Webhooks → the
  endpoint → resend the latest event, or ask them to open their account page
  (it re-reads Stripe).
- Deleting a member: they can delete their own account from the account page.
  Their Stripe customer stays (payment records are kept 7 years, Privacy
  section 8).
