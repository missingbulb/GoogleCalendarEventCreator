#!/usr/bin/env bash
#
# Stage 3 (deterministic) of the create-extractor routine (routine.md): validate
# the agent's work before a PR.
#   Exit 0   → the extraction is valid; the agent opens the PR (Closes #N).
#   Non-zero → do NOT open a PR. The agent hands the issue to a human, quoting the
#              printed reason. Reverts nothing: a scope violation FAILS the run
#              (the human PR review is the backstop, per the routine's containment
#              model), rather than silently rewriting the agent's work.
#
# Reads MODE / BRANCH / CASE_NAME / SOURCE_PATH / ISSUE_NUMBER from the env (the
# agent passes triage's names through). Assumes deps installed. cd's to repo root.

set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../../../../.."

fail() { echo "POSTCONDITION FAILED — do not open a PR, hand the issue to a human: $*" >&2; exit 1; }

# The agent's whole write surface is exactly two files. In supported mode SRC is an
# EXISTING shipped source (a minimal edit to it is allowed); in new mode it's the
# freshly-scaffolded one (the agent filled its extract()).
SRC="${SOURCE_PATH:?SOURCE_PATH required}"
CASE_FILE="dev/requirements/extractor/expected/$CASE_NAME.json"
# The recorded page. The fetch-page workflow (routine.md step 4) commits it AFTER
# 3-prepare's scaffold commit, so it shows up as changed-since-scaffold below even
# though the agent didn't author it — allow it alongside the two agent-owned files.
PAGE="dev/requirements/extractor/data/server-fetched/$CASE_NAME.html"

# The scaffold commit = 3-prepare's commit on this branch (off main), matched by its
# message; fall back to the oldest branch-only commit. The agent's changes are
# everything from there to now (committed or not).
SCAFFOLD=$(git log --format='%H' --grep="chore: scaffold" origin/main..HEAD 2>/dev/null | tail -1)
[ -n "$SCAFFOLD" ] || SCAFFOLD=$(git rev-list origin/main..HEAD 2>/dev/null | tail -1)
[ -n "$SCAFFOLD" ] || fail "no scaffold commit found on the branch — was 3-prepare run?"

# 1. SCOPE — only the source + the case may differ from the scaffold (plus the
#    workflow-recorded page). Anything else the agent touched (a shared helper, the
#    load lists, a new file) fails the run.
changed="$( { git diff --name-only "$SCAFFOLD"; git ls-files --others --exclude-standard; } \
  | sort -u | sed '/^$/d' )"
offenders="$(printf '%s\n' "$changed" | grep -Fvx -e "$SRC" -e "$CASE_FILE" -e "$PAGE" || true)"
[ -z "$offenders" ] || fail "out-of-scope changes (only $SRC and $CASE_FILE may change):
$(printf '  %s\n' $offenders)"

# 2. QUALITY FLOOR — a deterministic backstop to the agent's bail judgment. The
#    case must be a real, presentable event: not 'empty' (nothing extracted) and
#    not 'degenerate' (an event with no location — the signature of a listing/tour
#    page rather than one specific event).
VERDICT=$(CASE_FILE="$CASE_FILE" node "$HERE/case-quality.js")
[ "$VERDICT" = "ok" ] || fail "quality floor: the case is '$VERDICT' — no presentable single event to ship"

# 3. RE-VERIFY — never trust the agent; the whole suite must be green.
npm run test:live    || fail "test:live is not green"
npm run test:offline || fail "test:offline is not green"

echo "All postconditions passed — the extraction is valid. Open the PR (Closes #$ISSUE_NUMBER)."
exit 0
