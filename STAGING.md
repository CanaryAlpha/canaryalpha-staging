# Staging and production

Two copies of the site, built from the same commits:

| | Production | Staging |
|---|---|---|
| Address | https://canaryalpha.co/ | https://canaryalpha.github.io/canaryalpha-staging/ |
| Repo (git remote) | `CanaryAlpha/Canary-Alpha-Research-Beta` (`origin`), branch `main` | `CanaryAlpha/canaryalpha-staging` (`staging`), branch `main` |
| Search engines | Indexed | `noindex, nofollow` on every page; `robots.txt` disallows all |
| Banner | None | Yellow **STAGING** pill at the bottom of every page, with the build's commit |
| Custom domain | `CNAME` = canaryalpha.co | None: the staging build removes `CNAME` |
| Deploy | `npm run deploy:production` | `npm run deploy:staging` |

Production is the repo exactly as committed. Staging is a copy that
`tools/build-staging.py` changes on the way out (noindex, banner, no `CNAME`, no
sitemap, root paths moved under `/canaryalpha-staging/`), so **nothing
staging-only can ever reach canaryalpha.co**: the staging changes exist only
in the staging repo.

## The workflow

1. Work on a branch (e.g. `production-prep`) and commit.
2. `npm run deploy:staging` and check the change at the staging address.
3. `npm run deploy:production` and type `deploy` when asked. It publishes the
   same commit to canaryalpha.co and waits until the live site serves it.

Both commands deploy what is **committed** on the current branch and refuse to
run with uncommitted changes. Both first check that every JavaScript and JSON
file is valid.

`deploy:production` also refuses when:

- **This commit isn't on staging yet.** Deploy it to staging first. To skip
  this check on purpose, run `npm run deploy:production -- --skip-staging-check`.
- **Your branch doesn't contain the live site's latest commit.** Bring the
  branch up to date first. Production is only ever fast-forwarded, never
  force-pushed.

## One-time setup

1. **Create the staging repo.** On GitHub go to **CanaryAlpha → Repositories →
   New**. Name it `canaryalpha-staging`. Choose **Public**: on our free
   organization plan, GitHub Pages only publishes from public repos. Don't add
   a README, `.gitignore` or licence. Click **Create repository**.
2. **Add it as a remote** in this repo:
   `git remote add staging https://github.com/CanaryAlpha/canaryalpha-staging.git`
3. **Deploy once:** `npm run deploy:staging`. This creates the repo's `main`
   branch.
4. **Turn on Pages.** In the staging repo go to **Settings → Pages → Build and
   deployment**, set **Source** to **Deploy from a branch**, then **Branch** to
   **main** and **/ (root)**. Click **Save**. Leave **Custom domain** empty;
   staging must never use canaryalpha.co. The address appears at the top of
   that page within a minute or two.

## Things to know

- **The staging repo and address are both public.** GitHub Pages on our free
  organization plan only publishes from public repos, so anyone can browse the
  staging repo's files and visit the staging address. That's acceptable
  because the repo only ever holds built copies of pages that are public on
  canaryalpha.co anyway: no source history, no keys, nothing secret. Never
  push anything else to it. Search engines are told not to index it; don't
  share the link as if it were the real site.
- **The forms on staging are real.** They post to the same Formspree endpoints
  as production (`components/site.config.js`), so a test submission on staging
  arrives in the inbox like any other. If Formspree is set to accept only
  canaryalpha.co, staging submissions are rejected, and that's fine.
- **Staging builds never enter this repo's history.** The deploy script builds
  in a temporary folder and pushes to the staging repo only. Each staging commit
  is named `Staging build of <commit> (<branch>)`, which is how
  `deploy:production` checks that a commit was staged.
- The commands are plain shell and Python (`tools/deploy.sh`,
  `tools/build-staging.py`). `package.json` only names them; the site has no npm
  dependencies and no build step for production.
