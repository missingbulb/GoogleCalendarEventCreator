#!/usr/bin/env bash
# Hand-off step of the auto-implement-extractor pipeline — run by the prepare
# workflow (.github/workflows/auto-implement-extractor.yml) once Phase 1 has
# scaffolded and pushed the branch. See docs/claude/auto-extractor.md.
#
# The agent run no longer happens inside Actions: it's a Claude Code on the web
# routine wired to fire when the `extractor-agent-ready` label is added. So this
# step posts a machine-readable handoff comment (the agent reads it to know which
# branch + files to work on) and swaps the label — remove `extractor-request`,
# add `extractor-agent-ready` — which is what triggers that routine. The label is
# added LAST, after the comment exists, so the agent sees the handoff on arrival.
#
# (Why the relay works at all: a label added here with the Actions GITHUB_TOKEN
# still reaches the Claude GitHub App's webhook — the GITHUB_TOKEN
# no-recursion rule suppresses Actions *workflow* runs, not App webhook delivery.
# And when the agent later adds `extractor-agent-done` with the App's own token —
# not GITHUB_TOKEN — that DOES start the finalize workflow.)
#
# Reads GH_TOKEN / ISSUE_NUMBER / BRANCH / SLUG / CASE_NAME / HOST / EVENT_URL
# from the env (set by the workflow step).
set -euo pipefail

SRC="pipeline/sources/$SLUG.js"
CASE_FILE="test/extractors/custom/$CASE_NAME.json"

# Create the trigger label idempotently — GitHub won't make it on demand the
# first time the workflow runs (see docs/claude/github.md).
gh label create "extractor-agent-ready" --color 1D76DB \
  --description "Branch scaffolded; the implementation agent should write extract() + the case" \
  2>/dev/null || true

# The handoff comment: human-readable, with a machine-readable block the agent
# parses for the exact branch + file paths so it never has to re-derive them.
cat > /tmp/handoff-comment.md <<EOF
🤖 Branch prepared — handing off to the implementation agent.

The workflow has recorded the page, scaffolded the source with its \`matches()\`
filled, registered the host, and regenerated the load lists. The agent fills
\`extract()\` and the integration case, then re-labels the issue.

<!-- extractor-handoff
branch: $BRANCH
source: $SRC
case: $CASE_FILE
host: $HOST
url: $EVENT_URL
-->
EOF
gh issue comment "$ISSUE_NUMBER" --body-file /tmp/handoff-comment.md

# Swap the label: this removes the request marker and adds the trigger for the
# Claude Code web routine.
gh issue edit "$ISSUE_NUMBER" \
  --remove-label "extractor-request" \
  --add-label "extractor-agent-ready"
