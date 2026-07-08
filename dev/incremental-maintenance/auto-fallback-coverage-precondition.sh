#!/usr/bin/env bash
#
# Precondition guard for the daily fallback-coverage routine
# (dev/incremental-maintenance/auto-fallback-coverage.md).
#
# WHAT IT DOES
#   Exits 0  → a meaningful code change landed in the window ⇒ run the routine.
#   Exits 1  → nothing meaningful changed ⇒ the routine should stop (it prints why).
#   The routine's only job is to run this and honor the exit code, so the gate's
#   full rationale lives HERE (in code that can't drift), not in the routine prose.
#
# WHY THE GATE EXISTS
#   The routine's result is a pure function of its inputs. Most days nothing lands
#   on main, and a run over unchanged code just re-derives yesterday's answer while
#   burning a full Opus run — the routine's own doc notes "most runs correctly
#   change nothing". So an idle repo should skip. This is a cheap "has anything
#   happened lately?" check, NOT a prediction that the change will yield a win.
#
# WHAT "MEANINGFUL" MEANS — deliberately broad, and reusable
#   A meaningful change is any commit in the window that touches real source: i.e.
#   NOT a commit whose files are entirely docs (*.md) or derived GENERATED /
#   generated artifacts (those are outputs, not inputs). We intentionally do NOT
#   try to prove a change is relevant to fallback coverage specifically — the
#   notion is meant to generalize to the other daily routines, and a narrow,
#   too-clever gate that skips a real opportunity is worse than an occasional
#   no-op run. WHEN IN DOUBT, RUN: a run that finds nothing is cheap and
#   self-correcting (it simply makes no PR). The only things that suppress a run
#   are an idle repo or pure docs/generated churn.
#
# NOTES
#   - Runs on a fresh, offline clone; inspects git history only (no network).
#   - Inspects the base branch: origin/main if present, else main, else HEAD —
#     so it works whether or not the remote ref was fetched.
#   - The window defaults to 24h; override with arg $1 (a `git log --since` value),
#     e.g. `... .sh "36 hours ago"` if a run was skipped and you want to catch up.
#   - Keep the routine doc's instruction minimal; tune the gate by editing this
#     file, not the prose.

set -uo pipefail

WINDOW="${1:-24 hours ago}"

# Pick the base ref to inspect: prefer the fetched remote, degrade gracefully.
ref=origin/main
git rev-parse --verify --quiet "$ref" >/dev/null 2>&1 || ref=main
git rev-parse --verify --quiet "$ref" >/dev/null 2>&1 || ref=HEAD

# List every file touched by commits in the window, then drop the lines that are
# never "meaningful": blanks (the --pretty separators), docs, and generated files.
# grep -Ev exits 1 when nothing survives the filter; `|| true` keeps that from
# aborting the script under pipefail and just yields an empty result.
changed=$(git log --since="$WINDOW" "$ref" --name-only --pretty=format: 2>/dev/null \
  | grep -Ev '(^$|\.md$|GENERATED|\.generated\.)' \
  || true)

if [ -n "$changed" ]; then
  exit 0   # meaningful change → proceed with the routine
fi

echo "No meaningful code changes in the last 24h — skipping fallback-coverage run."
exit 1     # nothing meaningful → skip the routine
