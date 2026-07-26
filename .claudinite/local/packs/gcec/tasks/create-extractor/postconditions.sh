#!/usr/bin/env bash
#
# Postcondition for the create-extractor task's AGENT stage (task.md §4): validate
# the agent's work before the draft PR is marked ready for review.
#   Exit 0   → the extraction is valid; mark the PR ready (task.md §5).
#   Non-zero → do NOT mark it ready. The agent bails: close the PR and hand the
#              issue to a human, quoting the printed reason. Reverts nothing — a
#              scope violation FAILS the run (the human PR review is the backstop,
#              per the pipeline's containment model), rather than silently
#              rewriting the agent's work.
#
# Takes NO env. Everything it needs is derivable from the branch preprocessing
# pushed: the case name from the branch, the source from the recorded page's own
# host. (It used to read five env vars the agent threaded through from a triage
# JSON blob — that hand-off is gone now that preprocessing owns the names and
# commits them, and derived-here can't drift from what was actually built.)

set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
TASK_DIR=".claudinite/local/packs/gcec/tasks/create-extractor"

fail() { echo "POSTCONDITION FAILED — do not mark the PR ready, hand the issue to a human: $*" >&2; exit 1; }

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
case "$BRANCH" in
  claude/extractor/*) ;;
  *) fail "not on a claude/extractor/* branch (on '$BRANCH') — work on the draft PR's head branch" ;;
esac
CASE_NAME="${BRANCH#claude/extractor/}"
CASE_FILE="dev/requirements/extractor/expected/$CASE_NAME.json"
URL_FILE="dev/requirements/extractor/data/server-fetched/$CASE_NAME.url"
[ -f "$CASE_FILE" ] || fail "no case at $CASE_FILE — was this branch scaffolded by the task's preprocessing?"
[ -f "$URL_FILE" ]  || fail "no recorded URL at $URL_FILE — was this branch scaffolded by the task's preprocessing?"

# The source that owns this case's host, asked of the sources' real matches() — the
# same authority triage used, so this can't disagree with what was scaffolded.
SRC_BASE="$(node "$TASK_DIR/resolve-source.js" "$(cat "$URL_FILE")" 2>/dev/null)"
[ -n "$SRC_BASE" ] || fail "no source matches this case's host — the scaffold's matches() is missing or was edited"
SRC="extension/event-extractors/custom/$SRC_BASE.js"

# The last commit preprocessing made on this branch (the scaffold, then the page
# record). `git log` is newest-first, so the first match is the baseline the agent's
# work sits on top of; fall back to the newest branch-only commit.
PREP=$(git log --format='%H' --grep='chore: scaffold' --grep='chore: record' origin/main..HEAD 2>/dev/null | head -1)
[ -n "$PREP" ] || PREP=$(git rev-list origin/main..HEAD 2>/dev/null | head -1)
[ -n "$PREP" ] || fail "no preprocessing commit found on the branch — was prepare.mjs run?"

# 1. SCOPE — only the source + the case may differ from what preprocessing left.
#    Anything else the agent touched (a shared helper, a re-recorded page, a new
#    file) fails the run. The recorded page is INSIDE the baseline now
#    (preprocessing committed it), so it is no longer an allowed change — a
#    re-recorded page is exactly the kind of drift this should catch.
#    The one other allowed outcome is the "nothing to override" one (task.md §3):
#    when the core generic extractor already covers the site, the agent DELETES
#    the scaffolded source, which regenerates the load list. That one generated
#    file is allowed for that reason alone. (The host needs no further change:
#    preprocessing already registered it in supportedDomains, which is what makes
#    the site supported.)
LOAD_ORDER="extension/event-extractors/load-order.generated.json"
changed="$( { git diff --name-only "$PREP"; git ls-files --others --exclude-standard; } \
  | sort -u | sed '/^$/d' )"
offenders="$(printf '%s\n' "$changed" | grep -Fvx -e "$SRC" -e "$CASE_FILE" -e "$LOAD_ORDER" || true)"
[ -z "$offenders" ] || fail "out-of-scope changes (only $SRC and $CASE_FILE may change):
$(printf '  %s\n' $offenders)"

# 1b. …and that escape hatch is exactly that: the load list may only differ
#     because the scaffolded source was deleted.
if printf '%s\n' "$changed" | grep -Fxq "$LOAD_ORDER"; then
  [ ! -e "$SRC" ] || fail "$LOAD_ORDER changed but $SRC still exists — the load list is generated, never hand-edited"
fi

# 2. QUALITY FLOOR — a deterministic backstop to the agent's bail judgment. The
#    case must be a real, presentable event: not 'empty' (nothing extracted) and
#    not 'degenerate' (an event with no location — the signature of a listing/tour
#    page rather than one specific event).
VERDICT=$(CASE_FILE="$CASE_FILE" node "$TASK_DIR/case-quality.js")
[ "$VERDICT" = "ok" ] || fail "quality floor: the case is '$VERDICT' — no presentable single event to ship"

# 3. RE-VERIFY — never trust the agent; the whole suite must be green.
npm run test:live    || fail "test:live is not green"
npm run test:offline || fail "test:offline is not green"

echo "All postconditions passed — mark the draft PR ready for review (task.md §5)."
exit 0
