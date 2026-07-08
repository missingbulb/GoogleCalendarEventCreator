#!/usr/bin/env bash
#
# Preconditions for the daily fallback-coverage routine
# (dev/incremental-maintenance/auto-fallback-coverage/routine.md).
#
# Runs BEFORE the agent's creative work and bundles every deterministic pre-step.
#   Exit 0  → proceed: the agent should try for a generic win.
#   Non-zero → do NOT run the routine (it printed why).
#
# ── Job 1: the 24h "has anything meaningful happened?" gate ───────────────────
# The routine's result is a pure function of its inputs. Most days nothing lands
# on main, and a run over unchanged code just re-derives yesterday's answer while
# burning a full Opus run. So an idle repo skips. This is a cheap freshness check,
# NOT a prediction that the change will yield a win.
#   A "meaningful change" is deliberately BROAD and reusable across the daily
#   routines: any commit in the window touching real source — i.e. NOT one whose
#   files are entirely docs (*.md) or derived GENERATED / generated artifacts
#   (outputs, not inputs). WHEN IN DOUBT, RUN: a run that finds nothing is cheap
#   and self-correcting (it just makes no PR); a too-clever gate that skips a real
#   opportunity is not. Only an idle repo or pure docs/generated churn suppresses.
#   Inspects git history only (offline). Base ref: origin/main → main → HEAD.
#   Window defaults to 24h; override with $1 (a `git log --since` value), e.g.
#   "36 hours ago" to catch up after a skipped run.
#
# ── Job 2: the baseline ───────────────────────────────────────────────────────
# `npm run test:live` runs the fallback-coverage gate on the UNMODIFIED code and
# prints the "fallback value differences (informational)" block + the per-exemplar
# matrix (✓ match · ~ different value · ✗ missing · — n/a): a `~` marks a concrete
# generic gap to chase, a `✗` means the fallback found nothing there. THIS run is
# the reference — attribute any post-change delta to it; do NOT re-derive the
# numbers with a git stash/rerun round trip (wasteful, and it conflicts on the
# ours-driver GENERATED artifacts). Gate mechanics: dev/procedures/testing.md.
# The pre-change headline percentages are snapshotted to .baseline.snapshot.json
# (gitignored) so postconditions.sh can prove the change really improved coverage.

set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(git -C "$here" rev-parse --show-toplevel)"

WINDOW="${1:-24 hours ago}"

# ── Job 1 ──
ref=origin/main
git rev-parse --verify --quiet "$ref" >/dev/null 2>&1 || ref=main
git rev-parse --verify --quiet "$ref" >/dev/null 2>&1 || ref=HEAD
# grep -Ev exits 1 when nothing survives the filter; `|| true` keeps that from
# aborting under pipefail and just yields an empty result.
changed=$(git log --since="$WINDOW" "$ref" --name-only --pretty=format: 2>/dev/null \
  | grep -Ev '(^$|\.md$|GENERATED|\.generated\.)' \
  || true)
if [ -z "$changed" ]; then
  echo "No meaningful code changes in the last 24h — skipping fallback-coverage run."
  exit 1
fi

# ── Job 2 ──
npm install || { echo "npm install failed — cannot establish a baseline." >&2; exit 2; }
npm run test:live || { echo "Baseline suite is not green — fix that first, don't run the routine on red." >&2; exit 2; }

node -e '
  const fs = require("fs");
  const b = JSON.parse(fs.readFileSync(
    "dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json", "utf8"));
  fs.writeFileSync(process.argv[1], JSON.stringify(
    { criticalFieldsPct: b.criticalFieldsPct, allFieldsPct: b.allFieldsPct }));
' "$here/.baseline.snapshot.json" || { echo "Could not snapshot the baseline." >&2; exit 2; }

echo "Preconditions passed — baseline established. Proceed with the routine."
exit 0
