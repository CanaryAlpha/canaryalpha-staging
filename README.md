# Canary Alpha Research

The website for Canary Alpha Research (canaryalpha.co): crypto research built
to institutional standards. The homepage is `index.html`; every other page is
a folder beside it (learn, reports, contact, sign up, terms, privacy,
disclaimer, plus the demo dashboards and design pages that production mode
hides). Published with GitHub Pages; `CNAME` holds the custom domain.

Plain HTML, CSS and JavaScript. No framework, no build step, no npm
dependencies, no keys.

## Preview it

Serve the repo folder over HTTP (opening the file directly with `file://`
drops some styles, and the glossary can't load its data):

```bash
python3 -m http.server 8765 --directory /path/to/canaryalpha-research-beta
```

Then open <http://localhost:8765/index.html>.

## Pages

| Page | File | Address |
|------|------|---------|
| Homepage | `index.html` | `/` |
| Reports (coming soon) | `reports/index.html` | `/reports/` |
| Company Holdings | `holdings/index.html` | `/holdings/` |
| Not found | `404.html` | any missing address |
| Full glossary (design page; production mode hides it) | `glossary/all.html` | `/glossary/all.html` |
| Terms of Service | `terms/index.html` | `/terms/` |
| Privacy Policy | `privacy/index.html` | `/privacy/` |
| Disclaimer | `disclaimer/index.html` | `/disclaimer/` |
| Feature animations (not linked; open by URL) | `animations-demo/index.html` | `/animations-demo/` |
| Consent checkbox test | `consent-test/index.html` | `/consent-test/` |
| Hero options (not linked; open by URL) | `hero-options/index.html` | `/hero-options/` |
| Contact Us | `contact/index.html` | `/contact/` |
| Sign up ("Join the list" in production mode) | `signup/index.html` | `/signup/` |
| Log in (demo accounts; production mode sends visitors to Sign up) | `login/index.html` | `/login/` |
| Free dashboard (sample data; any login) | `dashboard/index.html` | `/dashboard/` |
| Bitcoin / Ethereum detail (Free) | `dashboard/btc/`, `dashboard/eth/` | `/dashboard/btc/`, `/dashboard/eth/` |
| Pro dashboard (sample data; Pro or Enterprise) | `dashboard/pro/index.html` | `/dashboard/pro/` |
| Pro asset detail | `dashboard/pro/asset/index.html` | `/dashboard/pro/asset/?id=btc` (any asset id) |
| Enterprise dashboard (sample data; Enterprise) | `dashboard/enterprise/index.html` | `/dashboard/enterprise/` |
| Enterprise asset detail | `dashboard/enterprise/asset/index.html` | `/dashboard/enterprise/asset/?id=btc` |
| Bubble map options (not linked; Pro) | `dashboard/bubble-options/index.html` | `/dashboard/bubble-options/` |
| Learn hub | `learn/index.html` | `/learn/` |
| Learn glossary (explainers, A–Z) | `learn/glossary/index.html` | `/learn/glossary/` (`#term-id` for one term) |
| Learn video | `learn/video/index.html` | `/learn/video/?id=bitcoin-explained` |
| Learn article (Start here steps) | `learn/article/index.html` | `/learn/article/?id=common-scams` |
| Font compare (design tool; not linked) | `font-compare/index.html` | `/font-compare/` |

Every page shares the menu bar, the footer (brand, link columns, disclaimer
and copyright) and the favicon. Public pages carry a title, description,
canonical address and link-preview tags (`brand/og-image.png`); `robots.txt`
and `sitemap.xml` list them.

The dashboards need a demo login (see Demo login below). Logged out, the
menu shows Log in and Sign up; logged in, it shows a Dashboard group (Free,
Pro, Enterprise; locked plans marked) and an account menu.

### Homepage sections

| # | Section | Anchor |
|---|---------|--------|
| 1 | Hero: headline, hero visual, supporting text | `#top` |
| 2 | Our process: "Conviction, Evidence, and Rigor" bento grid | `#our-process` |
| 3 | How it works: three steps with blinking numbers | `#how-it-works` |
| 4 | Why us: four pillars with animated shapes | `#why-us` |
| 5 | Pricing: Free, Pro and Enterprise | `#pricing` |
| 6 | FAQ: accordion, plus FAQPage structured data | `#faq` |

The menu bar links to each section and highlights the one in view, then
links to the Glossary page. On the other pages the section links go back to
the homepage (`../#how-it-works`). It folds into a menu button below 900px.
Old links (`#section-3` to `#section-6`, `#framework`) redirect to the new
anchors.

## Glossary

All terms live in one data file, **`glossary/glossary.json`**; the page
(`glossary/glossary.js`) builds itself from it, so adding a term never
touches page code. It has search, category filters, an A–Z index (sticky on
desktop), expand/collapse, and a link for every term
(`/glossary/#slashing`). Alternate names get links too (`#tvl`), unless
another term already uses that name.

To add a term, copy an entry into the `"terms"` list (order doesn't matter;
the page sorts A–Z):

```json
{
  "term": "Whale Wallet",
  "slug": "whale-wallet",
  "definition": "A wallet holding enough of a token that its buying or selling can move the price on its own.",
  "example": "The top 10 wallets hold 41% of supply, so one whale exiting would hit thin order books.",
  "also": ["whale", "large holder"],
  "category": "on-chain",
  "firstUsedIn": "AAVE"
}
```

Required: `term`, `definition`, `category`. `slug` is made from the term if
left out. Categories: tokenomics, on-chain, market structure, security,
governance, technical, general finance, regulatory.

The file is a copy of `published/_glossary.json` from the
canaryalpha-research repo (the live site's source); `_source` at the top
records which version. Terms added there by new reports don't appear here
until they're copied across, and terms added here don't reach the live site.

## Education layer

Makes the research easier to understand. UI only, with SAMPLE content; no
external APIs or scripts (video embeds load only after Play). Everything is
education, never financial advice: each learning page and every popover
carries an "Education only, not financial advice" note linking to the
disclaimer.

- **Explain this:** a small circled "i" next to terms, metrics and
  sections (dashboards, asset pages, the homepage feature tiles, the
  scam-screening checks, the scoring categories and the Enterprise report
  stages). It opens a popover (a bottom sheet on phones) with What it
  means, What it does, Why it matters and How it changes the crypto space,
  plus "Learn more". `components/learn/explain.js`; in page HTML use
  `<span class="explain-slot" data-explain="term-id"></span>`.
- **Simple / Detailed:** a toggle in the dashboard control bar, asset
  headers and Learn pages. Simple adds one-line summaries, shows three
  timeframes and short popovers; Detailed shows every value and all four
  popover sections. Default: Simple for public and Free, Detailed for Pro
  and Enterprise; the choice is remembered (`localStorage` `ca-learn-mode`).
- **Key takeaways** at the top of each asset page and Learn article, and
  **Learn about [asset]** on asset pages: the explainer video, the case
  for and against (bull case, bear case, key risks) and related reading.
- **Learn hub:** Start here (five steps, progress saved in
  `localStorage` `ca-learn-path`), explainer videos, reading list, glossary.
- **Access tiers:** `components/learn/access.config.js` says which tier
  (public, free, pro, enterprise) sees what. Locked items show a preview
  (title, thumbnail, first line, a Pro label and a pricing link). Add
  `?tier=public`, `free`, `pro` or `enterprise` to any address to preview
  that tier (a small switcher appears). It changes the education content
  only; members' pages still need their demo login.

Content lives in one data file per type in `learn/data/`, each
starting with "TODO: replace sample content", so text changes never touch
code:

| File | What |
|------|------|
| `explainers.js` | every "Explain this" entry, keyed by term ID |
| `summaries.js` | Simple mode's one-line summaries (with `{placeholders}`) |
| `videos.js` | explainer videos: title, level, length, summary, takeaways, transcript, terms, `videoUrl` |
| `articles.js` | Learn articles and the Start here order |
| `reading.js` | reading list (all sample entries with `#` links) |
| `assets.js` | per-asset takeaways, case for and against, video and reading |

Settings that aren't content (approved reading outlets, topics, levels,
video categories, player hosts) are in `components/learn/learn.config.js`.
A video's `videoUrl` can be a YouTube, Vimeo or hosted `.mp4`/`.webm`
address: the page shows a Play button and loads the embed only when it is
pressed, with captions on (`captionsUrl` for hosted files). Code:
`components/learn/learn-core.js` (tier, mode, shared pieces),
`explain.js`, `learn-pages.js` (the Learn pages) and `learn.css`.

## Hero visual

The hero shows one of three animations, chosen by `heroVariant` in
`components/hero-visuals.config.js`: `"early-warning"` (default; on-chain
signals appear before the price moves), `"verdict"` (a report card fills in
and ends in a verdict) or `"noise"` (scattered points resolve into one line
and a verdict). Add `?hero=verdict` or `?hero=noise` to the homepage address
to preview one without editing. `/hero-options/` shows all three. All
data is fictional; the verdict and noise options use the scoring categories
and verdict bands from `components/feature-visuals.config.js`. The old
globe (`components/dotted-globe.*`, `vendor/cobe-2.0.1.js`) is unused; its
tags are commented out in `index.html`.

## Feature visuals

The four "Our process" tiles each have a small animated diagram: the scoring
framework, the on-chain wallet graph, the scam-screening checklist with its
chart, and the quarterly update cards. `/animations-demo/` shows all
four large, one per screen.

- **Settings:** `components/feature-visuals.config.js` holds every label,
  range, score band, probability and timing value. Totals, bar lengths and
  the counter are computed from the generated results.
- **Code:** `components/feature-visuals.js` (plain DOM and inline SVG, no
  libraries) and `components/feature-visuals.css` (layout, theme colours and
  choreography). Put `<div data-feature-visual="scoring"></div>` (or
  `forensics`, `screening`, `revisit`) on a page that loads the three files.
- **Cycle:** each visual animates, holds its final state, fades out and
  replays with new results, every `cycle.length` ms (10 s; `hold` 2 s,
  `reset` 1 s, the rest is animation). First runs are offset by
  `cycle.stagger` so visuals on screen together don't reset in sync. The
  clock only runs while a visual is on screen and the tab is visible.
- **Results:** every run is generated fresh and kept consistent: the score
  total is the sum of the categories and the verdict (Deploy Investment,
  Conditional Hold, Watch List, Avoid) comes from `scoring.bands`; the screening summary matches the flags, and the chart
  shows rising sell volume only when hidden sell pressure trips; each
  quarterly update follows on from the last (Q2 → Q3 → Q4 …), its verdict
  comes from the score via the same `scoring.bands`, and arrows and colours follow the sign of
  each change. No run repeats the one
  before it. The first run is fixed by `cycle.seed`, so it is the same on
  every load.
- With reduce motion on, the first run's final state shows and nothing
  moves or cycles.
- **Steady size:** a visual's markup is built once; each run only changes
  text, classes and attributes, and every changing text has a fixed slot
  (one line and truncated, or a fixed number of lines). So a visual is the
  same height on every frame and the page around it never moves. Keep it
  that way when editing: animate only opacity and transform, and don't add
  or remove elements during a run.
- The tiles and visuals have no panels or boxes: they sit straight on the
  page background. Graph labels and hollow marks are backed with
  `--fv-surface` (default `--ground`); set it if a visual is ever placed on
  another colour.

## Logo and favicon

The menu bar shows the "Canary α Research" logo instead of a text name. The
files are in `brand/`:

- `logo.svg` (takes the text colour), `logo-dark.svg` (white)
- `favicon.svg` (the α; black, white in dark mode), linked from every page
- PNGs at 512 and 1024px: `logo-*.png`, `logo-dark-*.png`, `favicon-*.png`
- `build_logo.py` rebuilds them all: `python3 brand/build_logo.py export`.
  The words are outlined from Inter Regular and the α is traced from
  `brand/reference/alpha.png`. It needs fontTools, Pillow and Inter
  (`brand/fonts/Inter[opsz,wght].ttf`, not committed; download it from
  <https://github.com/rsms/inter>).

The menu bar's copy of the logo is inline in `components/site-header.js`
(`LOGO`); after rebuilding, replace it with the output of
`python3 brand/build_logo.py header`.

## Files

- `index.html` — the homepage
- `styles.css` — page styles and the theme tokens
- `script.js` — theme toggle, back-to-top, FAQ accordion, active menu
  link, old-link redirects
- `steps-blink.js` — pauses the step-number blink while off screen
- `pillar-shapes.js` — the Why us shape animation
- `glossary/` — the glossary page, its script and `glossary.json`
- `terms/`, `privacy/`, `disclaimer/` — Terms of Service,
  Privacy Policy and Disclaimer
- `consent-test/` — test page for the signup consent checkbox
- `contact/`, `signup/` — the Contact Us and Sign up pages
- `dashboard/` — the Free dashboard, its `btc/` and `eth/` detail
  pages, the Pro dashboard (`pro/`, `pro/asset/`), the Enterprise
  dashboard (`enterprise/`, `enterprise/asset/`) and `bubble-options/`
- `components/dashboard/dashboard-reports.js` — Enterprise "Your custom
  reports" (progress bars, stage tracker, access panel); stages in
  `components/dashboard/report-stages.config.js`; live updates only through
  `subscribeToReportProgress` in `dashboard-api.js` (simulated for now)
- `brand/` — logo, favicon and the script that builds them
- `components/site-links.js` — every menu and footer link and label, in one
  place; the header and footer both read it
- `components/site-header.*` — the menu bar with the logo; the menu is a
  drop-down with Show (tablet and desktop only; stays open across
  scrolling and pages), Auto hide
  (default) and Hide options, remembered in `localStorage` (`ca-menu-mode`)
- `components/site-footer.js` — the footer: brand, link columns (Product,
  Resources, Legal) and copyright; styled in `styles.css`
- `components/feature-visuals.*` — the four animated "Our process" visuals
  and their config (see Feature visuals)
- `animations-demo/` — the four visuals large, one per screen
- `components/hero-visuals.*`, `components/hero-early-warning.js`,
  `components/hero-verdict.js`, `components/hero-noise.js` — the hero
  animation and its three options (see Hero visual)
- `hero-options/` — the three hero options, one after another
- `components/dotted-globe.*` — the old hero globe (unused), drawn with
  `vendor/cobe-2.0.1.js`
- `components/auth.js` — DEMO ONLY login (signIn, signUp, signOut,
  getCurrentUser, getUserTier); demo accounts in `components/auth.config.js`
  (free@ / pro@ / enterprise@demo.canaryalpha, password "demo");
  `components/auth-gate.js` guards members' pages (login redirect or
  paywall). Not secure: replace with a real auth provider before launch
- `assets/logos/` — Bitcoin and Ethereum logos (originals untouched in
  `originals/`; square 64 and 128px PNG and WebP); each asset's `logo` in
  `dashboard/dashboard-data.js` points here
- `components/form-fields.js` — validation, inline errors and the submit
  flow for the contact and signup forms. UI only: nothing is sent or saved;
  `submitContactForm` (`contact/contact.js`) and `submitSignupForm`
  (`signup/signup.js`) are where a form backend gets connected. Field
  names: `name`, `email`, `phone`, `message`, `sms_opt_in`
- `dashboard/dashboard-data.js` — the single sample-data file for the
  dashboards (12 assets, Fear & Greed, ETF flows, Puell, Rainbow, Pro whale
  and change notes). BTC and ETH are real names with sample values; the
  other ten tokens and all news are fictional
- `components/dashboard/dashboard-api.js` — the getters the dashboards read
  through (`getAssets`, `getAsset`, `getFearGreed`, `getEtfFlows`,
  `getNews`, `getExchanges`, `getIndicators`, `getProDetail`, …). Swap in
  live sources here; the UI never reads the data file directly
- `components/dashboard/dashboard-ui.js`, `dashboard-assets.js`,
  `dashboard-detail.js`, `dashboard-page.js`, `dashboard.css` — formatting,
  the cards/list view with its controls, the asset detail view and page
  boot. The Cards/List choice is remembered in `localStorage`
  (`ca-dash-view-free`, `ca-dash-view-pro`); nothing else is stored
- `components/dashboard/bubble-core.js`, `bubble-packed.js`,
  `bubble-scatter.js`, `bubble-activity.js` — the three market map styles (Pro shows every token; Free shows only Bitcoin and Ethereum)
- `components/learn/`, `learn/` — the education layer (see Education
  layer)
- `components/consent-checkbox.*` — required "I am 18 or older and agree to
  the Terms, Privacy Policy and Disclaimer" checkbox for the future signup
  form; it fills `terms_agreed_at`
- `components/form-privacy-note.html` — "By submitting, you agree to our
  Privacy Policy" line for the future contact form
- `components/report-disclaimer.html`, `legal/report-disclaimer.md` — short
  disclaimer for web reports and for pasting into DOCX/PDF reports

## Themes

Light (black on white) and Dark (white on black). The first visit follows the
system light/dark setting; a chosen theme is remembered in the browser. All
colours come from CSS variables (`--ground`, `--ink`, `--muted`, `--rule`,
`--selected-bg`, `--selected-ink`, `--success`, `--danger`) defined once per
theme in `styles.css`.

## Conventions

- Sizes in rem; motion is turned off under `prefers-reduced-motion`.
- After changing a CSS or JS file, bump its `?v=N` on every page that loads
  it, so browsers load the new version.
- A new page goes in its own folder in ``, and gets added to
  `components/site-links.js` (menu and/or a footer column). Each page's
  header and footer set `data-root` (`""` on the home page, `"../"` one
  folder down).
- Bigger features are built as a standalone prototype in `` first, then
  moved into the homepage once approved; the prototype is then removed.

## Production mode

`components/site.config.js` holds the site's settings, and every page loads it
first, followed by `components/site-mode.js`. With `productionMode: true` (the
public site), nothing that is not real yet is shown, and none of it is deleted:

- Log in and the dashboards (`<html data-page="account">`) send visitors to
  `signup/`, which shows "Accounts open soon. Join the list". The demo login
  and demo accounts are off, so nobody is ever logged in.
- Design and test pages (`<html data-page="dev">`) send visitors home.
- The `?fonts=` and `?fontpanel` testers and the Learn `?tier=` preview are off.
- Sample entries in the Learn reading list are left out (the section hides
  when it is empty).
- `[data-demo-only]` is hidden and `[data-production-only]` is shown (CSS in
  `styles.css`).

Set `productionMode: false` on your own machine to see the demo build.

**Forms.** `forms.waitlist` (signup/) and `forms.contact` (contact/) take
Formspree endpoints. `CA_FORM.send()` in `components/form-fields.js` posts only
the named fields. While an endpoint is `""`, the form checks what was typed and
asks the visitor to email hello@canaryalpha.co instead.

**Redirects.** GitHub Pages has no server redirects, so every old address has
a small redirect page: the old live site's `/reports/<slug>/`, `/glossary/`,
`/sign-in/` and `/sign-up/`, and every `/demo/...` page from the beta. They are
written by `tools/make-redirects.py`; edit its list and run it again.

## Company holdings

`data/holdings.json` is the only place holdings are recorded; its `_readme`
explains every field. It feeds the Company Holdings page (`holdings/`) and the
Disclosure line for future report pages (`components/holdings/disclosure.js`:
`<p data-disclosure="BTC" data-name="Bitcoin"></p>`, not used yet). The policy
(Disclaimer, section 8) is to disclose whether a position is held, never how
much: the page reads only token, status, date and report link, and leaves out
any entry that carries an amount-like field. Update `lastUpdated` with every
edit, and add to `changes` rather than deleting from it.

## Placeholders still to fill

- Education content (`learn/data/*.js`): every video is "coming soon", every reading-list entry and outlet is a sample with a `#` link, and the ten fictional tokens' "case for and against" is sample text.
- Demo login, sign-up and paywalls (`components/auth.js`): replace with the
  real auth provider and server-side plan checks. "Forgot password?" is `#`.
- Reports: `reports/` is a "coming soon" page.
- Enterprise report Download PDF / DOCX and View report buttons are `#`, and
  report progress is simulated (`subscribeToReportProgress` in
  `components/dashboard/dashboard-api.js`).
- All dashboard data is sample data (`dashboard/dashboard-data.js`).
- The feature visuals' example data (`components/feature-visuals.config.js`).
- Legal text (terms, privacy, disclaimer, consent, report block) needs
  review by an attorney before paid launch.

## Demo login

DEMO ONLY: `components/auth.js` keeps a session in the browser and is not
secure. Demo accounts (`components/auth.config.js`): `free@demo.canaryalpha`,
`pro@demo.canaryalpha`, `enterprise@demo.canaryalpha`, password `demo`.
`components/auth-gate.js` sends a logged-out visitor to `/login/` and
shows a paywall to a lower plan. Before launch it is replaced by the real
auth provider with server-side plan checks. Production mode switches it off.

## Fonts

Headings use Satoshi (Fontshare), body text Work Sans (Google Fonts), both
through `--font-heading` and `--font-body` in `styles.css`; the logo
wordmark uses Satoshi through `--font-logo`. Add `?fonts=1` to any page for
the font test panel (`components/font-panel.js`; `?fonts=0` turns it off);
`/font-compare/` shows every pairing side by side.

## Dev font panel

Add `?fontpanel` to the URL to show live font controls for the hero
(preview only, saved in the browser). It is hidden otherwise.
