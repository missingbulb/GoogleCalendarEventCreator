#!/usr/bin/env bash
# Hand-off step of the auto-implement-extractor pipeline — run by the prepare
# workflow (.github/workflows/auto-implement-extractor.yml) once Phase 1 has
# scaffolded and pushed the branch. See dev/create-extractor/auto-extractor.md.
#
# The agent run no longer happens inside Actions: it's a Claude Code on the web
# routine wired to fire when the `extractor-agent-ready` label is added. So this
# step just swaps the label — remove `extractor-request`, add
# `extractor-agent-ready` — which triggers that routine. The agent derives the
# branch + file names itself from the issue's event URL (same naming code Phase 1
# used), so no machine-readable hand-off is needed; the comment here is purely a
# human-readable status note.
#
# (Why the relay works at all: a label added here with the Actions GITHUB_TOKEN
# still reaches the Claude GitHub App's webhook — the GITHUB_TOKEN
# no-recursion rule suppresses Actions *workflow* runs, not App webhook delivery.
# And when the agent later adds `extractor-agent-done` with the App's own token —
# not GITHUB_TOKEN — that DOES start the finalize workflow.)
#
# Reads GH_TOKEN / ISSUE_NUMBER from the env (set by the workflow step).
set -euo pipefail

# Create the trigger label idempotently — GitHub won't make it on demand the
# first time the workflow runs (see dev/procedures/this_project/github.md).
gh label create "extractor-agent-ready" --color 1D76DB \
  --description "Branch scaffolded; the implementation agent should write extract() + the case" \
  2>/dev/null || true

gh issue comment "$ISSUE_NUMBER" --body "🤖 Branch prepared — handing off to the implementation agent. The workflow has recorded the page, scaffolded the source with its \`matches()\` filled, registered the host, and regenerated the load lists. The agent fills \`extract()\` and the integration case, then re-labels the issue."

# Swap the label: remove the request marker, add the trigger for the Claude Code
# web routine (added last, after the comment, so the agent sees the note on arrival).
gh issue edit "$ISSUE_NUMBER" \
  --remove-label "extractor-request" \
  --add-label "extractor-agent-ready"
