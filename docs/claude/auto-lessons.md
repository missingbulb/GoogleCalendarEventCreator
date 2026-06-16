# Automated daily "lessons" digest

A scheduled GitHub Actions workflow runs a Claude **Opus** agent once a day to do,
automatically and incrementally, what the on-demand **"learned lessons"**
instruction does (see `docs/claude/workflow.md`): review recent activity and fold
any durable, reusable insights into the Markdown docs. This covers the mechanics;
what makes a *good* lesson and where each kind belongs is defined by the
"learned lessons" routing in `workflow.md`.

## When it runs

`.github/workflows/daily-lessons.yml` runs on a `schedule` (`cron: "0 2 * * *"`,
≈05:00 Israel time — see the DST note in the workflow) and on `workflow_dispatch`
(run it by hand from the **Actions** tab to test or to digest on demand).

## What it does

1. **Activity gate (cheap, before any spend).** Counts commits and updated
   issues/PRs in the last 24h. If there were none, it logs "No activity" and
   **skips the agent entirely** — a quiet day costs nothing. This step also
   computes the `since` timestamp the prompt is built around.
2. Installs deps + the `claude` CLI, configures git, and interpolates `{{REPO}}`
   and `{{SINCE}}` into the prompt template (`.github/agent-prompt-lessons.md`).
3. Runs the agent (`claude --dangerously-skip-permissions --model claude-opus-4-8
   -p ...`) with Bash + `gh`.

The agent (per `.github/agent-prompt-lessons.md`):

- reads the last-24h **commits** (`git log --since`, full bodies, diffs where a
  fix is non-obvious) and **issue/PR activity** (`gh search issues/prs
  "updated:>=<since>"`, then the changed comments);
- extracts only **durable, reusable** lessons — gotchas, engineering practices,
  test discipline, architecture rules, project mechanics — and **dedupes** each
  against the existing docs;
- routes each to the doc that owns it (gotchas → `docs/technicalGotchas.md`,
  practices → `docs/engineeringPractices.md`, architecture →
  `docs/architectureGuidelines.md`, mechanics → `docs/claude/*`), keeping every
  addition terse;
- if it found at least one genuinely new lesson, opens a **PR for review** on a
  `claude/lessons/<date>` branch and dispatches `test.yml` against it (a
  `GITHUB_TOKEN` push doesn't trigger CI — see `docs/technicalGotchas.md`);
- otherwise does nothing: **no branch, no PR, no edits.** Most days are no-ops by
  design — that's what keeps the digest worth reading.

## Review gate

The agent never merges. A human reviews the PR — the docs are guidance everyone
reads, so a hallucinated or duplicative "lesson" is worse than nothing. "LGTM"
from the repo owner is the merge signal (see `docs/claude/workflow.md`).

## Required secrets

| Secret | Purpose |
|--------|---------|
| `ANTHROPIC_API_KEY_DAILY_LEARNING` | Authenticate the `claude` CLI — **must be set**. A key dedicated to this workflow (separate from the extractor's `ANTHROPIC_API_KEY`) so its spend can be capped and tracked independently in the Anthropic Console. |
| `GITHUB_TOKEN` | Standard Actions token — automatic, no setup |

Each active day spends one Opus run on `ANTHROPIC_API_KEY_DAILY_LEARNING`; set a
hard monthly **spend cap** on that key in the Anthropic Console to bound this
workflow's cost on its own. If the cap is hit, the run fails loudly (red in the
Actions tab) and the next day's run is independent.

## Permissions the workflow uses

- `contents: write` — push the `claude/lessons/<date>` branch
- `pull-requests: write` — open the PR
- `issues: read` — read issue/PR activity in the window
- `actions: write` — dispatch `test.yml` on the branch

## Tuning it

- **Time:** edit the `cron`. It's UTC and doesn't follow DST (see the workflow
  comment).
- **What it writes / how strict it is:** edit `.github/agent-prompt-lessons.md`
  (the dedupe bar and the routing table live there).
- **Auto-commit instead of a PR:** not recommended — the review gate is the point
  — but it would be a change to step 5 of the prompt plus dropping the PR step.

## On failure

A failed run shows red in the **Actions** tab (there's no triggering issue to
comment on). Common causes mirror the extractor workflow: a missing/expired
`ANTHROPIC_API_KEY`, or the agent exhausting its turn budget. The next day's run
is independent, so a single failure self-heals.
