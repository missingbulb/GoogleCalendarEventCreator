#!/usr/bin/env bash
# Phase 1 of the auto-implement-extractor pipeline — all deterministic, run by the
# workflow (.github/workflows/auto-implement-extractor.yml), not the agent. See
# dev/routines/create-extractor/auto-extractor.md.
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

# scraperapi_fetch — the project's single page-fetch, and the home of all our
# ScraperAPI-specific handling (tier escalation on failure, .il geo-targeting, the
# #279 non-HTML→fail guard, and the #603 wait_for_selector). Lives in
# scraperapi-fetch.sh so it can be unit-tested in isolation
# (dev/routines/create-extractor/test/scraperapi-fetch.test.js). Sourcing only defines the function.
source "$HERE/scraperapi-fetch.sh"

if [ -z "${EVENT_URL:-}" ]; then
  echo "phase1-prepare: no event URL provided — cannot record a page" >&2
  exit 1
fi

git checkout -b "$BRANCH"

# The .url file is the single source of truth for the page's URL (live.test.js reads
# it to set the DOM origin); the .html is the recorded page the tests assert against.
# Pipeline-recorded pages go under server-fetched/ (provenance is structural — see
# dev/requirements/extractor/data-files.js / .github/secret_scanning.yml).
mkdir -p "dev/requirements/extractor/data/server-fetched"
printf '%s' "$EVENT_URL" > "dev/requirements/extractor/data/server-fetched/$CASE_NAME.url"
# WAIT_SELECTOR (optional, #603): a CSS selector the extension derived from the
# live page, handed to ScraperAPI as wait_for_selector so a flaky SPA render waits
# for real content instead of snapshotting an empty shell. Empty -> plain fetch.
scraperapi_fetch "$EVENT_URL" "dev/requirements/extractor/data/server-fetched/$CASE_NAME.html" "${WAIT_SELECTOR:-}"
test -s "dev/requirements/extractor/data/server-fetched/$CASE_NAME.html"        # the page must have actually been recorded

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
