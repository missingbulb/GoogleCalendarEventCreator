#!/usr/bin/env bash
# Phase 1 of the auto-implement-extractor pipeline — all deterministic, run by the
# workflow (.github/workflows/auto-implement-extractor.yml), not the agent. See
# docs/claude/auto-extractor.md.
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
cd "$HERE/../.."

MODE="${MODE:-new}"

git checkout -b "$BRANCH"

printf '%s' "$EVENT_URL" > "data/$CASE_NAME.url"
: > "data/$CASE_NAME.html"            # empty file = the recorder's "fetch me" signal
npm run refresh
test -s "data/$CASE_NAME.html"        # the page must have actually been recorded

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
