#!/usr/bin/env bash
#
# Precondition gate for the daily fallback-coverage routine
# (dev/routines/auto-fallback-coverage/routine.md).
#
#   Exit 0   → a meaningful code change landed in the window ⇒ run the routine.
#   Non-zero → nothing meaningful changed ⇒ the routine stops (it prints why).
#
# WHY THE GATE EXISTS
#   The routine's result is a pure function of its inputs. Most days nothing lands
#   on main, and a run over unchanged code re-derives yesterday's answer while
#   burning a full model run. So an idle repo skips. This is a cheap "has anything
#   happened lately?" check, NOT a prediction that the change will yield a win.
#
# WHAT "MEANINGFUL" MEANS — deliberately broad, and reusable
#   Any commit in the window that touches real source — i.e. NOT one whose files
#   are entirely docs (*.md) or derived GENERATED / generated artifacts (outputs,
#   not inputs). The notion is meant to generalize across the daily routines, so it
#   does NOT try to prove a change is relevant to fallback coverage specifically.
#   WHEN IN DOUBT, RUN: a run that finds nothing is cheap and self-correcting (it
#   just makes no PR); a too-clever gate that skips a real opportunity is not. Only
#   an idle repo or pure docs/generated churn suppresses a run.
#
# Inspects git history only (offline). Base ref: origin/main → main → HEAD.
# Window defaults to 24h; override with $1 (a `git log --since` value), e.g.
# "36 hours ago" to catch up after a skipped run.

set -uo pipefail
cd "$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

WINDOW="${1:-24 hours ago}"

ref=origin/main
git rev-parse --verify --quiet "$ref" >/dev/null 2>&1 || ref=main
git rev-parse --verify --quiet "$ref" >/dev/null 2>&1 || ref=HEAD

# grep -Ev exits 1 when nothing survives the filter; `|| true` keeps that from
# aborting under pipefail and just yields an empty result.
changed=$(git log --since="$WINDOW" "$ref" --name-only --pretty=format: 2>/dev/null \
  | grep -Ev '(^$|\.md$|GENERATED|\.generated\.)' \
  || true)

if [ -n "$changed" ]; then
  exit 0   # meaningful change → run the routine
fi
echo "No meaningful code changes in the last 24h — skipping fallback-coverage run."
exit 1     # nothing meaningful → skip the routine
