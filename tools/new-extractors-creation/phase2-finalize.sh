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

# The agent's done-signal is a FILLED case. A still-empty `events` means it judged
# the page unextractable (and commented) — no PR.
N=$(CASE_FILE="$CASE_FILE" node -e "try{const e=require('./'+process.env.CASE_FILE).expected.events;process.stdout.write(String(Array.isArray(e)?e.length:0))}catch(_){process.stdout.write('0')}")
if [ "$N" = "0" ]; then
  echo "Integration case still empty — the agent judged the page unextractable and commented. No PR."
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
