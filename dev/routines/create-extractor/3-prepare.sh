#!/usr/bin/env bash
#
# Stage 1 (deterministic) of the create-extractor routine (routine.md): branch off
# main, record the event page, scaffold, and prove a green baseline — everything
# before the agent's judgment. Run by the routine once 2-triage.js has decided to
# proceed; the agent then fills extract() + the case against the recorded page.
#
# Two modes (from triage's $MODE):
#   new       — no source for the host yet. Scaffold the source (matches() filled)
#               + the placeholder case, register the host, regenerate load lists.
#   supported — the host already has a source. Scaffold ONLY a new placeholder case
#               for it (no new source, no supportedDomains entry, no load-list change).
# Commits the scaffold locally (message prefix "chore: scaffold" — 4-postconditions
# finds it to scope the agent's diff); the agent pushes at the end.
#
# Reads MODE / BRANCH / CASE_NAME / HOST / EVENT_URL / ISSUE_NUMBER / WAIT_SELECTOR
# from the env (the agent passes triage's names through). Assumes deps are already
# installed (routine.md runs `npm install` once up front). cd's to the repo root.

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../../.."

MODE="${MODE:-new}"

# scraperapi_fetch — the project's single page fetch and the home of all our
# ScraperAPI handling (tier escalation, .il geo-targeting, the non-HTML→fail guard,
# wait_for_selector). Split out so it's unit-tested in isolation; sourcing only
# defines the function.
source "$HERE/scraperapi-fetch.sh"

if [ -z "${EVENT_URL:-}" ]; then
  echo "3-prepare: no event URL provided — cannot record a page" >&2
  exit 1
fi

git checkout -b "$BRANCH"

DATA="dev/requirements/extractor/data/server-fetched"
mkdir -p "$DATA"
# The .url is the single source of truth for the page's URL (live.test.js reads it
# to set the DOM origin); the .html is the recorded page the tests assert against.
printf '%s' "$EVENT_URL" > "$DATA/$CASE_NAME.url"
# WAIT_SELECTOR (optional): a CSS selector the extension derived from the live page,
# handed to ScraperAPI as wait_for_selector so a flaky SPA render waits for real
# content instead of snapshotting a shell. Empty → plain fetch.
scraperapi_fetch "$EVENT_URL" "$DATA/$CASE_NAME.html" "${WAIT_SELECTOR:-}"
test -s "$DATA/$CASE_NAME.html"    # an undownloadable page fails here → the agent hands off

if [ "$MODE" = "supported" ]; then
  node "$HERE/scaffold.js" supported "$CASE_NAME" "$HOST"
  COMMIT_MSG="chore: scaffold $CASE_NAME case + cache page for $HOST (Refs #$ISSUE_NUMBER)"
else
  node "$HERE/scaffold.js" new "$CASE_NAME" "$HOST" "$EVENT_URL"
  npm run index
  COMMIT_MSG="chore: scaffold $CASE_NAME extractor + cache page (Refs #$ISSUE_NUMBER)"
fi

npm run test:offline    # the baseline must be green before the agent spends effort

git add -A
git commit -m "$COMMIT_MSG"
echo "Scaffold committed on $BRANCH — the agent now fills extract() + the case."
