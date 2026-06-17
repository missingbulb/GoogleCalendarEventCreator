#!/usr/bin/env bash
# Phase 2 of the auto-implement-extractor pipeline — deterministic wrap-up run by
# the workflow (.github/workflows/auto-implement-extractor.yml) after the agent
# stops, not the agent. See docs/claude/auto-extractor.md.
#
# Enforce the two-file blast radius (revert anything the agent touched outside the
# source + case), treat a still-empty case as a bail (the agent judged the page
# unextractable and commented — no PR), else re-verify, commit the source + case,
# open the PR, and dispatch test.yml so its checks attach to the branch.
#
# Reads GH_TOKEN / BRANCH / SLUG / CASE_NAME / HOST / ISSUE_NUMBER / REPO from the
# env (set by the workflow step). cd's to the repo root, so it runs from anywhere.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../.."

SRC="pipeline/sources/$SLUG.js"
CASE_FILE="test/extractors/custom/$CASE_NAME.json"

# Blast-radius guard: the agent's whole write surface is two pre-created files
# (the source + the case). Revert any OTHER tracked edit (e.g. a shared helper)
# back to the scaffold commit, and delete anything it created, so a misbehaving
# agent can't reach the PR. (If the extractor truly depended on a reverted helper
# edit, the re-verify below goes red and no PR opens — exactly what we want.)
mapfile -t CHANGED < <(git diff --name-only HEAD)
for f in "${CHANGED[@]}"; do
  if [ "$f" != "$SRC" ] && [ "$f" != "$CASE_FILE" ]; then
    echo "blast-radius guard: reverting unexpected change to $f"
    git checkout HEAD -- "$f"
  fi
done
git clean -fd >/dev/null 2>&1 || true

# Quality floor before a PR (tools/new-extractors-creation/case-quality.js). The
# agent ran — work started on this issue — so we ALWAYS leave a comment here
# rather than trusting the agent to have posted one (it doesn't reliably). Two
# non-PR verdicts, both expected outcomes (comment + exit 0 green, not a failure):
#   empty      — the agent judged the page unextractable and left the case empty.
#                It writes its diagnosis to BAIL_REASON_FILE (in /tmp, outside the
#                repo, so the blast-radius `git clean` above can't delete it); we
#                quote it when present, generic note otherwise.
#   degenerate — a filled case whose event has no location: the signature of a
#                listing/index/tour page that yielded only a bare title, not a
#                single event (#283). Don't ship it as a PR.
BAIL_REASON_FILE="${BAIL_REASON_FILE:-/tmp/agent-bail-reason.md}"
VERDICT=$(CASE_FILE="$CASE_FILE" node tools/new-extractors-creation/case-quality.js)

if [ "$VERDICT" = "empty" ]; then
  echo "Integration case still empty — the agent judged the page unextractable. No PR; commenting."
  if [ -s "$BAIL_REASON_FILE" ]; then
    DIAGNOSIS="$(cat "$BAIL_REASON_FILE")"
  else
    DIAGNOSIS="The cached page didn't contain the event data a static extractor needs (e.g. a bot/CAPTCHA wall, a login wall, or a JavaScript-rendered single-page-app shell)."
  fi
  gh issue comment "$ISSUE_NUMBER" --body "🛑 Looked into this, but didn't open a PR: $DIAGNOSIS

No dedicated extractor was added. The site can still be added by hand — see docs/claude/adding-a-source.md. (Scaffolding is left on branch \`$BRANCH\` for follow-up.)"
  exit 0
fi

if [ "$VERDICT" = "degenerate" ]; then
  echo "Extraction is degenerate (an event has no location) — likely a listing/index page, not a single event. No PR; commenting."
  gh issue comment "$ISSUE_NUMBER" --body "🛑 Looked into this, but didn't open a PR: the extraction came out degenerate — an event with no venue/location, which is the signature of a tour/artist/listing page (several dates, no single event) rather than one specific event page. A clean extractor needs a single event with a real date and venue.

No dedicated extractor was added. Point the request at one specific event page on this site, or add it by hand — see docs/claude/adding-a-source.md. (Scaffolding is left on branch \`$BRANCH\` for follow-up.)"
  exit 0
fi

# Don't trust the agent — re-verify before opening a PR.
npm run test:live
npm run test:offline

git add "$SRC" "$CASE_FILE"
if ! git diff --cached --quiet; then
  git commit -m "feat: add $SLUG extractor (Refs #$ISSUE_NUMBER)"
  git push origin "$BRANCH"
fi

cat > /tmp/pr-body.md <<EOF
Implements the extractor for \`$HOST\`.

The workflow scaffolded the branch — the \`matches()\` gate, the \`supportedDomains\` entry, the regenerated load lists, and the real cached event page (\`data/$CASE_NAME.html\`). The agent wrote \`extract()\` and the integration case asserting the real extraction.

Closes #$ISSUE_NUMBER
EOF

if ! gh pr view "$BRANCH" >/dev/null 2>&1; then
  gh pr create --base main --head "$BRANCH" \
    --title "feat: add $SLUG extractor" --body-file /tmp/pr-body.md
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

PR_URL=$(gh pr view "$BRANCH" --json url -q .url 2>/dev/null || echo "")
gh issue comment "$ISSUE_NUMBER" --body "✅ Extractor implemented — PR ready for review: $PR_URL  (asserts against the real cached page; review the \`extract()\` logic and field values before merging)."
