#!/usr/bin/env bash
# Phase 1 of the auto-implement-extractor pipeline — all deterministic, run by the
# workflow (.github/workflows/auto-implement-extractor.yml), not the agent. See
# dev/procedures/claude/auto-extractor.md.
#
# Two modes (set by triage via $MODE):
#   new       — the host has no source yet. Branch off main, record the event page,
#               scaffold the source (matches() filled) + the placeholder case,
#               register the host in supportedDomains, regenerate the load lists.
#   supported — the host ALREADY has a dedicated source. Branch off main, record
#               the event page, and scaffold ONLY a new placeholder case for that
#               existing source (no new source, no supportedDomains entry, no load
#               list change). The agent then fills the case and, if the page needs
#               it, makes a minimal edit to the existing source.
# Either way: require a green test:offline baseline before the agent is spent, then
# commit (message starts "chore: scaffold" — Phase 2 finds this commit by it) + push.
#
# Reads MODE / BRANCH / CASE_NAME / HOST / EVENT_URL / ISSUE_NUMBER from the env
# (set by the workflow step). cd's to the repo root, so it runs from anywhere.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../../.."

MODE="${MODE:-new}"

# Record the event page's HTML — the ONE place this project fetches a target page.
# Fetching is delegated wholesale to ScraperAPI (residential proxy + bot/CAPTCHA
# bypass + render=true JS rendering) when SCRAPER_API_KEY is set: the datacenter
# runner is otherwise bot-blocked, and render=true makes a JS single-page-app
# record with real data instead of an empty shell. With no key, fetch directly with
# a browser UA (a developer on a residential IP needs none). `curl -f` makes a
# non-2xx a hard failure, so an undownloadable page fails the job (the "Comment on
# failure" step then hands the issue to a human). Swap vendors by changing this one
# function. (jq is preinstalled on the runner; it percent-encodes the target URL so
# its own query can't leak up as sibling ScraperAPI params.)
record_page() {
  local url="$1" out="$2"
  if [ -n "${SCRAPER_API_KEY:-}" ]; then
    local encoded; encoded="$(jq -rn --arg u "$url" '$u|@uri')"
    curl -fsS --max-time 90 --retry 3 --retry-delay 2 --retry-all-errors \
      "https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&render=true&url=${encoded}" -o "$out"
  else
    curl -fsS --max-time 30 --retry 3 --retry-delay 2 --retry-all-errors \
      -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" \
      "$url" -o "$out"
  fi
}

if [ -z "${EVENT_URL:-}" ]; then
  echo "phase1-prepare: no event URL provided — cannot record a page" >&2
  exit 1
fi

git checkout -b "$BRANCH"

# The .url file is the single source of truth for the page's URL (live.test.js reads
# it to set the DOM origin); the .html is the recorded page the tests assert against.
printf '%s' "$EVENT_URL" > "dev/requirements/extractor/data/$CASE_NAME.url"
record_page "$EVENT_URL" "dev/requirements/extractor/data/$CASE_NAME.html"
test -s "dev/requirements/extractor/data/$CASE_NAME.html"        # the page must have actually been recorded

if [ "$MODE" = "supported" ]; then
  # Add a case only — the source already exists and is registered.
  node "$HERE/scaffold-case.js" "$CASE_NAME" "$HOST"
  COMMIT_MSG="chore: scaffold $CASE_NAME case + cache page for $HOST (Refs #$ISSUE_NUMBER)"
else
  node "$HERE/scaffold-source.js" "$EVENT_URL"
  node "$HERE/scaffold-case.js" "$CASE_NAME" "$HOST"   # the agent FILLS this; it never creates a file
  node "$HERE/add-supported-domain.js" "$HOST"
  npm run index
  COMMIT_MSG="chore: scaffold $CASE_NAME extractor + cache page (Refs #$ISSUE_NUMBER)"
fi

npm run test:offline                  # baseline must be green before the agent

git add -A
git commit -m "$COMMIT_MSG"
# One branch per request; a re-label of the same issue re-records onto it, so this
# run owns the branch and force is intentional.
git push -u --force origin "$BRANCH"
