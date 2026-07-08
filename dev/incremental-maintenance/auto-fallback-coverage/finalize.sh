#!/usr/bin/env bash
#
# Finalize a validated fallback-coverage win: branch, commit, push.
# Run ONLY after postconditions.sh has exited 0.
#
#   Usage: finalize.sh "<commit subject>"
#
# Scripts the deterministic git mechanics of the routine's output step. Opening the
# PR and logging the run on the tracking issue stay AGENTIC in routine.md: they need
# the GitHub MCP tools, which the sandbox shell cannot call — the in-session git
# remote is a git-only proxy with no API token, and `gh` reaches no api.github.com
# (see dev/procedures/github.md). So this stops at `push`; the agent opens the PR.
#
# Branch: claude/fallback-coverage/<UTC date>. Commits the WHOLE working tree — the
# generic-extractor change, the covering test, and the regenerated GENERATED
# artifacts — which postconditions already confirmed is in scope.

set -euo pipefail
cd "$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

subject="${1:?usage: finalize.sh \"<commit subject>\"}"
branch="claude/fallback-coverage/$(date -u +%Y-%m-%d)"

git checkout -B "$branch"
git add -A
git commit -m "$subject"

# Retry push on transient network failure: 2s, 4s, 8s, 16s.
delay=2
for attempt in 1 2 3 4 5; do
  if git push -u origin "$branch"; then
    echo "Pushed $branch. Now open the PR (never merge) and log the run via the GitHub tools."
    exit 0
  fi
  [ "$attempt" -eq 5 ] && { echo "push failed after retries" >&2; exit 1; }
  sleep "$delay"; delay=$((delay * 2))
done
