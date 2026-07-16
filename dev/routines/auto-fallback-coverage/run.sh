#!/usr/bin/env bash
#
# Cheap nightly DISPATCHER gate for the fallback-coverage routine
# (dev/routines/auto-fallback-coverage/routine.md).
#
# This is the front door the nightly trigger hits FIRST — on the cheapest available
# model, in a context-free session (no CLAUDE.md / project docs loaded). It is pure
# code: it decides, deterministically and with NO model reasoning, whether tonight is
# worth a real run before any expensive model is spun up.
#
#   Exit 0  → PROCEED: something meaningful may have changed. The dispatcher must now
#             spawn ONE strong-model subagent to execute routine.md end to end.
#   Exit !0 → SKIP:    nothing meaningful changed. The dispatcher stops in one line —
#             no subagent, no branch, no PR. This is the common case; keep it cheap.
#
# WHY A SEPARATE DISPATCHER GATE
#   routine.md is executed by a STRONG model with the full project context loaded —
#   expensive to boot. Most nights the gate skips, so booting the strong model just to
#   run `preconditions.sh` and immediately stop wastes the whole boot (model + the
#   CLAUDE.md @import chain + the SessionStart hooks). Running the identical gate HERE,
#   in the cheap context-free dispatcher, spins up the strong model ONLY on the nights
#   `preconditions.sh` actually passes. This wrapper adds NO new gating logic — the
#   meaning of "meaningful change" lives entirely in preconditions.sh; run.sh only
#   turns its verdict into a dispatch instruction. Any argument is passed straight
#   through (e.g. a wider "36 hours ago" window to catch up after a skipped night).

set -uo pipefail
cd "$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

here="dev/routines/auto-fallback-coverage"

if bash "$here/preconditions.sh" "$@"; then
  echo "PROCEED — spawn ONE strong-model subagent to execute $here/routine.md end to end (start at step 2)."
  exit 0
fi
echo "SKIP — no run tonight (preconditions.sh printed the reason above)."
exit 1
