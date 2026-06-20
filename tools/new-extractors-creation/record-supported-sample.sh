#!/usr/bin/env bash
# "supported" disposition of the auto-implement-extractor triage — run by the
# prepare workflow (.github/workflows/auto-implement-extractor.yml) when a request
# targets a host that ALREADY has a dedicated source. There's no agent run and no
# leader issue, but the user's event page is still a real page the existing
# extractor could be hardened against — so instead of discarding it, record it on
# that host's standing "Additional sample pages" enhancement issue for a
# maintainer to turn into an extra integration case. See docs/claude/auto-extractor.md.
#
# The issue is found by its exact title (one per host) under the
# `extractor-samples` label, find-or-create-reopen style (matching the standing
# tracking-issue convention in docs/agenticBestPractices.md): reopen it if it was
# closed while samples are still accruing. The body edit itself is the offline,
# unit-tested attach-sample-url.js (idempotent marked block — the same one the
# leader-sample flow uses), so re-submitting the same URL is a no-op.
#
# Reads from the env (set by the workflow step):
#   GH_TOKEN   — auth for gh
#   HOST       — the www-stripped host (triage output)
#   SAMPLE_URL — the event URL to record (triage output)
#   GITHUB_REPOSITORY / GH_REPO — owner/repo
set -euo pipefail

: "${HOST:?HOST is required}"
: "${SAMPLE_URL:?SAMPLE_URL is required}"
REPO="${GH_REPO:-${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}}"

TITLE="Additional sample pages: ${HOST}"
LABEL="extractor-samples"
ATTACH="tools/new-extractors-creation/attach-sample-url.js"

# The label must exist before it can be applied — GitHub won't create it on
# demand (see docs/claude/github.md). Idempotent.
gh label create "$LABEL" --repo "$REPO" --color 0E8A16 \
  --description "Real event pages collected to harden an existing extractor" \
  2>/dev/null || true

# Find this host's enhancement issue by EXACT title (any state), lowest number
# wins. Exact-match in jq, not the fuzzy --search, so a longer host's issue can't
# shadow a shorter one.
NUM="$(gh issue list --repo "$REPO" --state all --label "$LABEL" --limit 200 \
  --json number,title,state \
  | jq -r --arg t "$TITLE" '[.[] | select(.title == $t)] | sort_by(.number) | .[0].number // empty')"

if [ -z "$NUM" ]; then
  # No issue yet: open one whose body already carries the URL in the block.
  INTRO="Real event pages submitted via the \"Request support for this site\" flow for \`${HOST}\`, which already has a dedicated extractor (\`pipeline/sources/\`). Each is raw material to harden that extractor with another \`test/extractors/custom/\` integration case."
  BODY="$(ISSUE_BODY="$INTRO" SAMPLE_URL="$SAMPLE_URL" node "$ATTACH")"
  NEW_URL="$(gh issue create --repo "$REPO" --title "$TITLE" --label "$LABEL" --body "$BODY")"
  echo "Opened $NEW_URL and recorded $SAMPLE_URL as the first sample for $HOST."
else
  STATE="$(gh issue view "$NUM" --repo "$REPO" --json state -q .state)"
  if [ "$STATE" = "CLOSED" ]; then
    gh issue reopen "$NUM" --repo "$REPO"
    echo "Reopened #$NUM (it was closed while samples are still accruing)."
  fi
  ISSUE_BODY="$(gh issue view "$NUM" --repo "$REPO" --json body -q .body)" \
    SAMPLE_URL="$SAMPLE_URL" node "$ATTACH" > /tmp/samples-body.md
  gh issue edit "$NUM" --repo "$REPO" --body-file /tmp/samples-body.md
  echo "Recorded $SAMPLE_URL on #$NUM (additional sample for $HOST)."
fi
