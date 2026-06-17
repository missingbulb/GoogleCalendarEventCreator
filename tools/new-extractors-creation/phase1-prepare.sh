#!/usr/bin/env bash
# Phase 1 of the auto-implement-extractor pipeline — all deterministic, run by the
# workflow (.github/workflows/auto-implement-extractor.yml), not the agent. See
# docs/claude/auto-extractor.md.
#
# Branch off main, record the event page inline (same fetcher the probe used),
# scaffold the source with matches() filled + the placeholder case, register the
# host in supportedDomains, regenerate the load lists, and require a green
# test:offline baseline before the agent is spent — then commit and push.
#
# Reads BRANCH / SLUG / CASE_NAME / HOST / EVENT_URL / ISSUE_NUMBER from the env
# (set by the workflow step). cd's to the repo root, so it runs from anywhere.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../.."

git checkout -b "$BRANCH"

printf '%s' "$EVENT_URL" > "data/$CASE_NAME.url"
: > "data/$CASE_NAME.html"            # empty file = the recorder's "fetch me" signal
npm run refresh
test -s "data/$CASE_NAME.html"        # the page must have actually been recorded

node "$HERE/scaffold-source.js" "$EVENT_URL"
node "$HERE/scaffold-case.js" "$CASE_NAME" "$HOST"   # the agent FILLS this; it never creates a file
node "$HERE/add-supported-domain.js" "$HOST"
npm run index
npm run test:offline                  # baseline must be green before the agent

git add -A
git commit -m "chore: scaffold $SLUG extractor + cache page (Refs #$ISSUE_NUMBER)"
# One branch per host; a re-label of the same issue re-records onto it, so this
# run owns the branch and force is intentional.
git push -u --force origin "$BRANCH"
