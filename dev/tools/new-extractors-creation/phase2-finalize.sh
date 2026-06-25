#!/usr/bin/env bash
# Phase 2 of the auto-implement-extractor pipeline — deterministic wrap-up, run by
# the finalize workflow (.github/workflows/finalize-extractor.yml) when the agent
# adds the `extractor-agent-done` label, NOT by the agent. See
# dev/procedures/this_project/auto-extractor.md.
#
# Since the agent now runs in a separate environment (Claude Code on the web,
# triggered by the `extractor-agent-ready` label) it commits and pushes its two
# files itself; this workflow checks the branch out fresh. So the blast-radius
# guard diffs the agent's commits against the SCAFFOLD COMMIT (Phase 1's commit)
# rather than the working tree — it reverts anything the agent changed outside the
# source + case, in a new commit. Then it runs the quality floor, re-verifies
# (never trusting the agent), opens the PR, dispatches test.yml, and clears the
# `extractor-agent-done` label.
#
# Reads GH_TOKEN / MODE / BRANCH / SLUG / SOURCE_BASE / SOURCE_PATH / CASE_NAME /
# HOST / ISSUE_NUMBER / REPO from the env (set by the workflow step). cd's to the
# repo root, so it runs from anywhere.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../../.."

MODE="${MODE:-new}"
# The agent's two-file write surface. In supported mode SRC is an EXISTING,
# shipped source (the agent may make a minimal edit to it to pass the new case);
# in new mode it's the freshly-scaffolded one. The blast-radius guard allows edits
# to exactly these two and reverts everything else.
SRC="${SOURCE_PATH:-extension/event-extractors/custom/$SLUG.js}"
CASE_FILE="dev/requirements/extractor/expected/$CASE_NAME.json"

# This workflow is triggered by an `issues` event, so the checkout lands on the
# default branch — fetch + switch to the agent's branch. Map both refs explicitly
# (the checkout action's refspec may be narrow) so origin/main is available for the
# scaffold-commit search and origin/$BRANCH for the checkout.
git fetch origin "+refs/heads/main:refs/remotes/origin/main" \
                 "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"

# Hand the issue to a human: drop the trigger label and flag for a maintainer,
# with an explanatory comment. Used for both non-PR verdicts below. ($1 = comment)
hand_off_to_human() {
  gh label create "extractor-blocked-needs-human" --color B60205 \
    --description "Automation could not proceed; a maintainer needs to take this over by hand" \
    2>/dev/null || true
  gh issue comment "$ISSUE_NUMBER" --body "$1"
  gh issue edit "$ISSUE_NUMBER" --remove-label "extractor-agent-done" \
    --add-label "extractor-blocked-needs-human"
}

# The scaffold commit = Phase 1's commit on this branch (off main). Match it by
# its message so extra agent commits or ordering can't fool us; fall back to the
# oldest branch-only commit. The blast-radius guard rewinds everything except the
# agent's two files to this point.
SCAFFOLD=$(git log --format='%H' --grep="chore: scaffold" "origin/main..HEAD" | tail -1)
if [ -z "$SCAFFOLD" ]; then
  SCAFFOLD=$(git rev-list "origin/main..HEAD" | tail -1)
fi
echo "Scaffold commit: $SCAFFOLD"

# Blast-radius guard: the agent's whole write surface is two pre-created files
# (the source + the case). Revert any OTHER change it committed (a shared helper,
# the load lists, a new file) back to the scaffold state, in a fresh commit, so a
# misbehaving agent can't reach the PR. (If the extractor truly depended on a
# reverted edit, the re-verify below goes red and no PR opens — exactly right.)
REVERTED=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if [ "$f" != "$SRC" ] && [ "$f" != "$CASE_FILE" ]; then
    echo "blast-radius guard: reverting unexpected change to $f"
    # Restore from scaffold; if the file didn't exist then (agent created it), remove it.
    git checkout "$SCAFFOLD" -- "$f" 2>/dev/null || git rm -f --quiet "$f" 2>/dev/null || true
    REVERTED=1
  fi
done < <(git diff --name-only "$SCAFFOLD" HEAD)
if [ "$REVERTED" = "1" ]; then
  git add -A
  git commit -m "chore: revert out-of-bounds agent edits to the two-file write surface (Refs #$ISSUE_NUMBER)" || true
fi

# Quality floor before a PR (dev/tools/new-extractors-creation/case-quality.js). The
# agent signals success by filling the case AND adding `extractor-agent-done`; a
# bail goes the other way (it comments + labels `extractor-blocked-needs-human`
# itself and never reaches here). So two non-PR verdicts are anomalies we still
# guard against, both handed to a human (comment + relabel, exit 0 green):
#   empty      — the agent marked the work done but left the case empty.
#   degenerate — a filled case whose event has no location: the signature of a
#                listing/index/tour page that yielded only a bare title (#283).
VERDICT=$(CASE_FILE="$CASE_FILE" node dev/tools/new-extractors-creation/case-quality.js)

if [ "$VERDICT" = "empty" ]; then
  echo "Case is empty but the agent marked it done — handing to a human. No PR."
  hand_off_to_human "🛑 The implementation agent marked this done, but the integration case came back empty — there's no extraction to ship. The page likely wasn't a single usable event (a bot/login wall or a JavaScript single-page-app shell). No dedicated extractor was added; the site can be added by hand — see dev/procedures/this_project/adding-a-source.md. (Scaffolding is on branch \`$BRANCH\`.)"
  exit 0
fi

if [ "$VERDICT" = "degenerate" ]; then
  echo "Extraction is degenerate (an event has no location) — likely a listing page. No PR."
  hand_off_to_human "🛑 Didn't open a PR: the extraction came out degenerate — an event with no venue/location, which is the signature of a tour/artist/listing page (several dates, no single event) rather than one specific event page. A clean extractor needs a single event with a real date and venue. Point the request at one specific event page on this site, or add it by hand — see dev/procedures/this_project/adding-a-source.md. (Scaffolding is on branch \`$BRANCH\`.)"
  exit 0
fi

# Don't trust the agent — re-verify before opening a PR.
npm ci
npm run test:live
npm run test:offline

# The agent already committed + pushed the two files; only the blast-radius
# revert above (if any) is new here. Push whatever this job added.
git push origin "$BRANCH"

if [ "$MODE" = "supported" ]; then
  PR_TITLE="test: add integration case for $HOST (hardens $SOURCE_BASE)"
  cat > /tmp/pr-body.md <<EOF
Adds a fresh integration case for \`$HOST\`, which is already handled by \`$SRC\`.

This request came in for an already-supported host, so instead of a new source the pipeline recorded the submitted page (\`dev/requirements/extractor/data/$CASE_NAME.html\`) and the agent added \`$CASE_FILE\` asserting the real extraction — a second real page hardening the existing extractor. Any change to \`$SRC\` itself (if the new page needed one to pass) is in the diff for review; all pre-existing cases still pass (re-verified).

Closes #$ISSUE_NUMBER
EOF
else
  PR_TITLE="feat: add $SLUG extractor"
  cat > /tmp/pr-body.md <<EOF
Implements the extractor for \`$HOST\`.

The workflow scaffolded the branch — the \`matches()\` gate, the \`supportedDomains\` entry, the regenerated load lists, and the real cached event page (\`dev/requirements/extractor/data/$CASE_NAME.html\`). The agent wrote \`extract()\` and the integration case asserting the real extraction.

Closes #$ISSUE_NUMBER
EOF
fi

# Surface the work as an OPEN PR for review. Detect an existing one with
# `gh pr list --state open` — NOT `gh pr view`, which also matches a stale CLOSED
# PR (e.g. a prior attempt on the same slug-only new-source branch
# `claude/extractor/<slug>`). The old `gh pr view` check skipped creation whenever
# ANY PR existed, then surfaced that closed PR as "ready for review" (a re-trigger
# of #276 pointed at the long-closed #278). A closed PR doesn't block creating a
# fresh one, so create when there's no OPEN PR.
PR_URL=$(gh pr list --head "$BRANCH" --base main --state open --json url -q '.[0].url' 2>/dev/null || echo "")
if [ -z "$PR_URL" ]; then
  gh pr create --base main --head "$BRANCH" \
    --title "$PR_TITLE" --body-file /tmp/pr-body.md
  PR_URL=$(gh pr list --head "$BRANCH" --base main --state open --json url -q '.[0].url' 2>/dev/null || echo "")
fi

# A GITHUB_TOKEN push/PR doesn't start test.yml; dispatch it so checks attach to
# the branch head and show on the PR. Best-effort: the PR is already open, so a
# dispatch hiccup mustn't fail the run (which would post a misleading "workflow
# failed" comment).
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPO/actions/workflows/test.yml/dispatches" \
  -d "{\"ref\":\"$BRANCH\"}" || echo "warning: test.yml dispatch failed — dispatch it manually"

if [ "$MODE" = "supported" ]; then
  gh issue comment "$ISSUE_NUMBER" --body "✅ Already-supported host — added a fresh integration case hardening \`$SOURCE_BASE\`. PR ready for review: $PR_URL  (asserts against the real cached page; review the case values and any \`$SRC\` change before merging)."
else
  gh issue comment "$ISSUE_NUMBER" --body "✅ Extractor implemented — PR ready for review: $PR_URL  (asserts against the real cached page; review the \`extract()\` logic and field values before merging)."
fi
# Terminal state for the automation: clear the trigger label now the PR is open.
gh issue edit "$ISSUE_NUMBER" --remove-label "extractor-agent-done" || true
