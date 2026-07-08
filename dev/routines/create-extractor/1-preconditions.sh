#!/usr/bin/env bash
#
# Precondition gate for the create-extractor routine (routine.md).
#   Exit 0   → the routine can run.
#   Non-zero → stop (it prints why).
#
# The routine records the target event page from a datacenter environment, where a
# direct fetch is bot-blocked, so it needs SCRAPER_API_KEY — the one external
# dependency the routine owner provisions (see routine.md). Without it 3-prepare
# can't record a page and the run would only fail later, after wasted work. Gate on
# it up front. Also require a clean tree so the branch and its diff are trustworthy.

set -uo pipefail
cd "$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

if [ -z "${SCRAPER_API_KEY:-}" ]; then
  echo "SCRAPER_API_KEY is not set — the routine can't record event pages from this environment. The routine owner provisions it; set it and retry." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean — run the routine from a fresh checkout of main." >&2
  exit 1
fi

echo "Preconditions passed."
exit 0
