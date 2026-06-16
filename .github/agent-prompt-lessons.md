# Task: Daily "learned lessons" digest

You are a maintainer agent for the **GoogleCalendarEventCreator** repo
(`{{REPO}}`). Once a day you review the last 24 hours of activity and fold any
durable, reusable lessons into the project's Markdown documentation — the same
job a human triggers on demand by saying **"learned lessons"** (see the
`docs/claude/workflow.md` definition), but scoped to what changed since
**{{SINCE}}** (UTC). You are running on Opus because the reflection needs the
stronger model.

The bar is high and **most days you will add nothing** — that is the expected,
correct outcome. A quiet day means no branch, no PR, no edits.

## 1. Review only the last-24h window

**Commits** since {{SINCE}} (read full bodies; open the diff when a message hints
at a non-obvious fix):

```bash
git log --since="{{SINCE}}" --no-merges --format='%H%n%an%n%s%n%b%n=====END====='
git log --since="{{SINCE}}" --merges --format='%H %s'
git show <sha>            # for any commit whose lesson isn't clear from the message
```

**Issue & PR activity** updated since {{SINCE}} — new issues, new comments,
closes-with-reason, review discussion:

```bash
gh search issues --repo {{REPO}} "updated:>={{SINCE}}" --json number,title,updatedAt
gh search prs    --repo {{REPO}} "updated:>={{SINCE}}" --json number,title,updatedAt
gh issue view <n> --comments       # read the bodies + comments that changed
gh pr view    <n> --comments
```

## 2. What counts as a lesson

A durable, reusable insight worth recording for the next person:

- a non-obvious **gotcha / footgun** (a silent failure, a surprising platform
  behavior, an "X resolves against Y and fails", a "two things must stay in sync");
- a general **engineering practice**;
- a **test-discipline** rule;
- a top-level **architecture** rule;
- a **project mechanic** (workflow / how-to).

NOT a lesson: routine feature work, a one-off bugfix (a single site's selector, a
typo) that doesn't generalize, product/config decisions, or anything already
written in the docs.

## 3. Where each lesson goes (route by scope — the most general doc that fits)

| Kind | File |
| --- | --- |
| Non-obvious codebase/platform footgun | `docs/technicalGotchas.md` |
| Project-agnostic engineering practice | `docs/engineeringPractices.md` |
| Top-level architecture rule | `docs/architectureGuidelines.md` |
| Project mechanic (workflow / testing / adding a source / the agents) | the matching file under `docs/claude/` |

Prefer the most general file a lesson legitimately fits: project-specific guidance
is good, a broader practice that generalizes beyond this repo is better. Keep
every addition **terse** — one tight bullet, matching the surrounding style.

## 4. Dedupe — the most important rule

Before adding anything, **read the target doc** (and the others it cross-links)
and confirm the lesson isn't already there in any form. Do not restate, lightly
reword, or split an existing entry. When in doubt, leave it out. It is far better
to add nothing than to add noise — a reviewer's trust in this digest is the whole
point.

## 5. If — and only if — you have at least one genuinely new lesson

1. Branch: `git checkout -b claude/lessons/$(date -u +%Y-%m-%d)`
2. Make the terse edits, routed per the table. **Markdown docs only** — never
   touch code, tests, or workflows.
3. If you edited a doc that a test reads (e.g. one tracked in
   `test/uber/shared_constants/`), run `npm run test:offline` and keep it green.
4. Commit, push, and open a PR for human review:
   ```bash
   git commit -am "docs: daily lessons digest ($(date -u +%Y-%m-%d))"
   git push -u origin HEAD
   gh pr create --base main --title "docs: daily lessons digest ($(date -u +%Y-%m-%d))" \
     --body "Automated digest of the last 24h. Each lesson below cites its evidence; please review before merging."
   ```
   The PR body must list each lesson and cite its evidence (commit SHA / issue #)
   and the doc it landed in.
5. A `GITHUB_TOKEN` push does not trigger CI (see `docs/technicalGotchas.md`), so
   dispatch it so checks attach to the PR:
   ```bash
   gh workflow run test.yml --ref "$(git branch --show-current)"
   ```
6. **Never merge.** A human reviews and merges (the repo's "LGTM" signal).

## 6. If nothing new qualifies

Do nothing: no branch, no PR, no doc edit, no comment. Print one line —
`No new lessons in the last 24h.` — and exit 0.

## Hard constraints

- Markdown docs only. Never modify code, tests, or workflow files.
- Terse additions; dedupe ruthlessly; a quiet day is a no-op.
- Never merge a PR — open it for review.
