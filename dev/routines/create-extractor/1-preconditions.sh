#!/usr/bin/env bash
#
# Precondition gate for the create-extractor routine (routine.md).
#   Exit 0   → the routine can run.
#   Non-zero → stop (it prints why).
#
# The target event page is recorded by the fetch-page GitHub Action (routine.md
# step 4), which owns SCRAPER_API_KEY as an Actions secret — the routine's own
# (Claude web) environment no longer needs the key, so there's nothing to gate on
# here. We only require a clean tree so the branch and its diff are trustworthy.

set -uo pipefail
cd "$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean — run the routine from a fresh checkout of main." >&2
  exit 1
fi

echo "Preconditions passed."
exit 0
