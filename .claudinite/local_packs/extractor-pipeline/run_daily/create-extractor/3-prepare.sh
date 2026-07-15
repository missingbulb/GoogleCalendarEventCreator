#!/usr/bin/env bash
#
# Stage 1 (deterministic) of the create-extractor routine (routine.md): branch off
# main, scaffold, prove a green baseline, and push the branch — everything before
# the agent's judgment EXCEPT recording the page. The page itself is recorded by the
# fetch-page GitHub Action (routine.md step 4), which owns the ScraperAPI secret;
# this script only writes the .url the fetch needs and pushes the branch so that
# workflow can run on it. The agent then fills extract() + the case against the page.
#
# Two modes (from triage's $MODE):
#   new       — no source for the host yet. Scaffold the source (matches() filled)
#               + the placeholder case, register the host, regenerate load lists.
#   supported — the host already has a source. Scaffold ONLY a new placeholder case
#               for it (no new source, no supportedDomains entry, no load-list change).
# Commits the scaffold (message prefix "chore: scaffold" — 4-postconditions finds it
# to scope the agent's diff) and pushes the branch; the fetch workflow adds the
# recorded .html on top, and the agent pushes the implementation at the end.
#
# The offline baseline does NOT depend on the recorded page (test:offline uses
# synthetic HTML; only test:live, in stage 5, reads the .html) — so scaffolding and
# proving green before the fetch is correct and keeps this script network-free.
#
# Reads MODE / BRANCH / CASE_NAME / HOST / EVENT_URL / ISSUE_NUMBER from the env (the
# agent passes triage's names through; WAIT_SELECTOR is used by the fetch workflow,
# not here). Assumes deps are already installed (routine.md runs `npm install` once
# up front). cd's to the repo root.

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../../../../.."

MODE="${MODE:-new}"

if [ -z "${EVENT_URL:-}" ]; then
  echo "3-prepare: no event URL provided — cannot record a page" >&2
  exit 1
fi

git checkout -b "$BRANCH"

DATA="dev/requirements/extractor/data/server-fetched"
mkdir -p "$DATA"
# The .url is the single source of truth for the page's URL (live.test.js reads it
# to set the DOM origin, and the fetch-page workflow records that URL); the .html it
# produces lands on the branch in step 4. We do NOT create the .html here.
printf '%s' "$EVENT_URL" > "$DATA/$CASE_NAME.url"

if [ "$MODE" = "supported" ]; then
  node "$HERE/scaffold.js" supported "$CASE_NAME" "$HOST"
  COMMIT_MSG="chore: scaffold $CASE_NAME case for $HOST (Refs #$ISSUE_NUMBER)"
else
  node "$HERE/scaffold.js" new "$CASE_NAME" "$HOST" "$EVENT_URL"
  npm run index
  COMMIT_MSG="chore: scaffold $CASE_NAME extractor (Refs #$ISSUE_NUMBER)"
fi

npm run test:offline    # the baseline must be green before the agent spends effort

git add -A
git commit -m "$COMMIT_MSG"

# Push the branch so the fetch-page workflow (routine.md step 4) can run on it and
# commit the recorded .html back. Retry on transient network errors.
for delay in 0 2 4 8 16; do
  [ "$delay" -eq 0 ] || sleep "$delay"
  git push -u origin "$BRANCH" && break
done

echo "Scaffold committed and pushed on $BRANCH — next: record the page (routine.md step 4)."
