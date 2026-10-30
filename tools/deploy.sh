#!/usr/bin/env bash
#
# deploy.sh - publish the site to staging or production. See STAGING.md.
#
#   npm run deploy:staging                 (or: bash tools/deploy.sh staging)
#   npm run deploy:production              (or: bash tools/deploy.sh production)
#
# Both deploy the COMMITTED state of the current branch (HEAD), never
# uncommitted edits, and both refuse to run with a dirty working tree.
#
# staging     Builds a staging copy of HEAD (tools/build-staging.py: noindex,
#             STAGING banner, no CNAME) and pushes it to the "staging" remote
#             (CanaryAlpha/canaryalpha-staging), which GitHub Pages serves at
#             https://canaryalpha.github.io/canaryalpha-staging/.
#             Nothing is pushed to origin; canaryalpha.co is not touched.
#
# production  Pushes HEAD to origin's main, which GitHub Pages serves at
#             https://canaryalpha.co/. Fast-forward only (never a force push).
#             Refuses unless this exact commit was deployed to staging first,
#             and asks you to type "deploy" to confirm. Then waits until the
#             live site serves the new files.
#
# Options (production):
#   --skip-staging-check   deploy a commit that was not staged first
#   --yes                  don't ask for confirmation (for scripted runs)
#
set -euo pipefail

STAGING_REMOTE="${STAGING_REMOTE:-staging}"
STAGING_BASE="${STAGING_BASE:-/canaryalpha-staging/}"
STAGING_URL="${STAGING_URL:-https://canaryalpha.github.io/canaryalpha-staging/}"
PRODUCTION_URL="${PRODUCTION_URL:-https://canaryalpha.co/}"

die() { echo "deploy: $*" >&2; exit 1; }
root=$(git rev-parse --show-toplevel) || die "not inside the site repo"
cd "$root"
[ -f tools/build-staging.py ] && [ -f index.html ] || die "run this from the site repo"

target="${1:-}"; shift || true
skip_staging_check=0; yes=0
for arg in "$@"; do
  case "$arg" in
    --skip-staging-check) skip_staging_check=1 ;;
    --yes) yes=1 ;;
    *) die "unknown option: $arg" ;;
  esac
done

[ -z "$(git status --porcelain)" ] || die "the working tree has uncommitted changes. Commit or stash them first: deploys publish what is committed."
sha=$(git rev-parse HEAD); short=${sha:0:7}
branch=$(git rev-parse --abbrev-ref HEAD)

checks() {
  echo "== checks on $short"
  local bad=0 f
  while IFS= read -r f; do
    node --check "$f" 2>/dev/null || { echo "   JS syntax error: $f"; bad=1; }
  done < <(git ls-files '*.js' | grep -v '^marketing-animations/')
  while IFS= read -r f; do
    python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$f" 2>/dev/null || { echo "   invalid JSON: $f"; bad=1; }
  done < <(git ls-files '*.json' | grep -v '^marketing-animations/')
  [ "$bad" = 0 ] || die "checks failed; nothing was deployed"
  echo "   JavaScript and JSON are valid"
}

deploy_staging() {
  local url; url=$(git remote get-url "$STAGING_REMOTE" 2>/dev/null) \
    || die "no \"$STAGING_REMOTE\" remote. Set it up once (STAGING.md): git remote add staging https://github.com/CanaryAlpha/canaryalpha-staging.git"
  checks
  local build work; build=$(mktemp -d); work=$(mktemp -d)
  trap "rm -rf '$build' '$work'" EXIT   # paths fixed now: the locals are gone by exit
  git archive "$sha" | tar -x -C "$build"
  python3 tools/build-staging.py "$build" --sha "$sha" --base "$STAGING_BASE"
  [ ! -e "$build/CNAME" ] || die "staging build still has a CNAME file; refusing to push"

  # A separate deploy repo, so staging builds never enter this repo's history.
  git -C "$work" init -q -b main
  if git -C "$work" fetch -q "$url" main 2>/dev/null; then
    git -C "$work" reset -q --soft FETCH_HEAD
  fi
  (cd "$build" && tar -cf - .) | (cd "$work" && tar -xf -)
  # add -A also records files deleted on the branch, so they leave staging too.
  git -C "$work" add -A .
  if git -C "$work" rev-parse -q --verify HEAD >/dev/null && git -C "$work" diff --cached --quiet; then
    echo "== staging already serves $short; nothing to push"
  else
    git -C "$work" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
      commit -q -m "Staging build of $sha ($branch)"
    git -C "$work" push -q "$url" HEAD:main
    echo "== pushed staging build of $short ($branch)"
  fi
  echo "   $STAGING_URL  (GitHub Pages usually updates within 1-2 minutes)"
  echo "   canaryalpha.co was not touched."
}

deploy_production() {
  checks
  git fetch -q origin main
  git merge-base --is-ancestor origin/main "$sha" \
    || die "$short does not contain the live site's latest commit (origin/main). Bring your branch up to date first; production is never force-pushed."
  [ "$(git rev-parse origin/main)" != "$sha" ] || { echo "== production already serves $short; nothing to do"; return; }

  if [ "$skip_staging_check" = 0 ]; then
    local url staged
    url=$(git remote get-url "$STAGING_REMOTE" 2>/dev/null) || die "no staging remote; deploy to staging first (or pass --skip-staging-check)"
    staged=$(git ls-remote "$url" refs/heads/main | cut -f1)
    [ -n "$staged" ] || die "staging has never been deployed; run npm run deploy:staging first"
    local tmp; tmp=$(mktemp -d); trap "rm -rf '$tmp'" EXIT
    git -C "$tmp" init -q && git -C "$tmp" fetch -q --depth 1 "$url" main
    git -C "$tmp" log -1 --format=%s FETCH_HEAD | grep -q "$sha" \
      || die "staging is not serving $short. Run npm run deploy:staging and check it first (or pass --skip-staging-check)."
    echo "   staging serves this exact commit"
  fi

  local old; old=$(git rev-parse origin/main)
  echo "== about to publish to $PRODUCTION_URL"
  git log --oneline "$old..$sha" | sed 's/^/   /'
  if [ "$yes" = 0 ]; then
    read -r -p "Type deploy to publish these commits to canaryalpha.co: " answer
    [ "$answer" = deploy ] || die "cancelled; nothing was published"
  fi
  git push -q origin "$sha:refs/heads/main"
  # Move the local main along too, but only ever fast-forward it.
  [ "$branch" = main ] || git fetch -q . "$sha:main" 2>/dev/null || echo "   note: local main was not fast-forwarded; update it by hand"
  echo "== pushed $short to origin main; waiting for $PRODUCTION_URL"

  # Done when the live site serves the committed bytes of every changed page,
  # stylesheet, script and data file (up to 8 of them).
  local files f n=0 ok i
  files=$(git diff --name-only --diff-filter=AM "$old" "$sha" | grep -E '\.(html|css|js|json|txt|xml)$' | grep -v '^marketing-animations/' | head -8 || true)
  [ -n "$files" ] || { echo "   no page files changed; nothing to wait for"; return; }
  for i in $(seq 1 40); do
    ok=1
    for f in $files; do
      cmp -s <(curl -s -m 20 "$PRODUCTION_URL$f") <(git show "$sha:$f") || { ok=0; break; }
    done
    [ "$ok" = 1 ] && { echo "== live: canaryalpha.co serves $short ($(echo "$files" | wc -l | tr -d ' ') changed files checked)"; return; }
    sleep 15
  done
  die "pushed, but canaryalpha.co was not serving the new files after 10 minutes. Check the repo's Pages build on GitHub."
}

case "$target" in
  staging) deploy_staging ;;
  production) deploy_production ;;
  *) die "usage: tools/deploy.sh staging|production [--skip-staging-check] [--yes]" ;;
esac
