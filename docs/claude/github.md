# GitHub procedures

How we drive GitHub: the issue → branch → PR → merge lifecycle, the merge
signal, the branch/commit-history rules for PR work, the CI-interaction
practices that keep a merge cheap in wall time and tokens, and how we keep
merge-conflict churn cheap across parallel branches. The two owner-triggered
defined instructions that also land through this PR flow — "bump version" and
"learned lessons" — keep their definitions in [workflow.md](workflow.md) (they
reference the flow here).

## The task lifecycle

For every new task in this repo:

1. Create a GitHub issue describing the task before starting work.
2. Develop on a branch; reference that issue number in commit messages (e.g.
   `Refs #123`, `Fixes #123`, or `Closes #123`).
3. Update the issue's status (comments / close) as work progresses and when it's
   done.

## The merge signal — "LGTM"

When the repo owner says "LGTM" on a change, treat it as approval to merge that
branch's pull request into `main`. Merge via **squash**, appending the PR number
to the title as `(#N)` — matching `main`'s linear, one-commit-per-PR history. CI
must be green first; the test-flakiness gate in
[../engineeringPractices.md](../engineeringPractices.md) (twice-green) applies
only when the change adds or touches an e2e/heavy-browser test. After merging,
also run **"learned lessons"** (see [workflow.md](workflow.md)) on the
conversation before closing out.

"LGTM" (like any approval) applies **only backward**, to the work already in
front of the owner when it's given — never to anything requested or done *after*
it. A later follow-up, even a fix to the just-merged change, needs its own
explicit "LGTM" before it may be merged; don't carry one approval forward, and
don't treat a chosen answer to an `AskUserQuestion` as merge authorization
because an option's wording happened to mention merging. When in doubt, open the
PR, get CI green, and wait for a fresh "LGTM".

## Branch and commit history

- Don't rewrite published/shared history to satisfy a tooling or authorship
  check (e.g. a hook flagging "unverified" commits): only amend your own
  un-pushed branch commits. Commits already on a shared branch — including ones
  merged in from `main` — belong to that history; reset-authoring or rebasing
  them forks your branch away from it.
- After your commit is **squash-merged** to `main`, a *reused* feature branch
  still carries that original commit (the squash created a *new* commit on
  `main`, so the branch's own is unreachable from it) — and the next PR off the
  branch re-includes it in the diff, because the three-dot merge-base predates
  the squash. Sync the branch to `origin/main` before opening the next PR
  (`git rebase origin/main`, which drops the commit as an already-applied
  cherry-pick, or a hard reset): it's your own un-merged branch, so this is the
  amend-your-own-commits case above, not rewriting shared history.

## A push or PR made with the Actions `GITHUB_TOKEN` does not start another workflow

GitHub suppresses workflow runs triggered by the built-in `GITHUB_TOKEN` to
prevent recursion, so a workflow's own `git push` or `gh pr create` won't fire
`test.yml` or `refresh-cache.yml`. The one exception is `workflow_dispatch` /
`repository_dispatch` — which is why the auto-extractor pipeline dispatches
`refresh-cache.yml` and `test.yml` explicitly (see
[auto-extractor.md](auto-extractor.md)). A run dispatched against a branch
executes on its head commit, so its checks still attach to the PR.

## An automated job needs a unique branch per run

An automated or scheduled job that derives its branch name from a non-unique key
(e.g. the date) collides with itself on a repeat run for that key — `git
checkout -b` fails when the branch already exists, and a push to the diverged
remote branch is rejected non-fast-forward (so the run can't even open its PR).
Give every run its own branch: append a per-run-unique suffix (`$RANDOM` / a
short token) to the readable prefix.

## A workflow that adds a brand-new label must create it first

`gh issue edit --add-label "<name>"` fails when the label doesn't exist yet —
unlike applying an already-defined label, GitHub won't create it on demand, so a
workflow that introduces a new label breaks the first time it runs. Create it
idempotently before the edit (`gh label create "<name>" --color … 2>/dev/null ||
true`), then `--add-label`. (The download-failure hand-off in
`auto-implement-extractor.yml` adds `human involvement required` this way.)

## Driving a merge cheaply (wall time + tokens)

Getting from "LGTM" to a merged PR wastes both if CI is treated as a fixed
poll-and-sleep ritual. These came out of a post-mortem on exactly that gap:

- **Merge on an already-green check; don't trigger or wait for a duplicate
  run.** A branch `git push` already runs `test.yml` on the head commit. Opening
  a PR on that *same* commit fires a second, identical run — for a deterministic
  offline/docs change it tells you nothing new. Before waiting, check whether the
  PR head SHA already has a green required check (from the push) and merge on it.
- **Wait on the condition, not a blind sleep.** Don't `sleep N` against a run of
  unknown length and then re-poll — you over- or under-shoot. Use a single
  background wait that exits the instant the check leaves `in_progress` (one
  notification), then merge. The GitHub MCP tools aren't callable from Bash here
  (no `gh` CLI), so the loop just signals completion and one MCP poll confirms.
- **Never tight-poll.** Consecutive status calls that return the same
  `in_progress` are pure token waste, as is re-reading a background job's output
  file after its completion notification already fired. One poll → wait → one
  poll.
- **Batch tool loading.** `ToolSearch` for every GitHub MCP tool the flow needs
  (`issue_write`, `create_pull_request`, `pull_request_read`,
  `merge_pull_request`) in one call, not one per turn.

## Avoiding merge-conflict churn across parallel branches

Working in parallel sessions / multiple branches is normal here, and the
conflicts cluster on a few files every branch regenerates. These rules keep them
cheap.

### Generated files are regenerated, never hand-merged

Adding a source or changing the popup regenerates derived artifacts. Don't
resolve a conflict in one by hand — take either side and rerun the generator:

```
npm run regen   # load lists + UI snapshots + fallback-coverage baseline/report
```

The committed `.gitattributes` maps each generated file to the `ours` merge
driver, so git keeps one side automatically and `npm run regen` reproduces the
correct merged result from the (normally-merged) source files. A stale artifact
can't slip through — its own test fails: the load-order/worker-imports drift
guard (`test/unit/load-order-generated.test.js`), the UI snapshot pixel diff, or
the fallback-coverage gate.

Files under this rule (kept in sync with `.gitattributes`):

- `pipeline/load-order.generated.json` and `pipeline/worker-imports.generated.js`
  — both from `npm run index`.
- `test/ui/cases/*.png` and `test/ui/README.md` — from `npm run refresh:ui`.
- `test/extractors/fallback/fallback-coverage.baseline.GENERATED.json` and
  `test/extractors/fallback/fallback-coverage.GENERATED.md` — from the
  fallback-coverage test, which `npm run regen` runs (it rewrites them locally;
  in CI the gate is read-only). If `regen` reports a coverage regression here,
  that's the real gate firing — review it, don't paper over it.

### One-time local git setup

The `ours` driver and conflict-replay are per-clone git config, not committed.
`scripts/cloud-setup.sh` sets them in the cloud sandbox; on a local clone run
once:

```
git config rerere.enabled true     # replay a resolution the next time it recurs
git config merge.ours.driver true  # the driver .gitattributes maps generated files to
```

Without them nothing breaks — the generated files just fall back to a normal
(manual) conflicting merge.

### Keep divergence small

Conflict size scales with how long a branch lives and how far it drifts from
`main`. Sync early rather than at the end: when starting work on a branch,
`git merge origin/main` (or rebase) and `npm run regen` first, so the branch
carries the latest sources and freshly-generated artifacts instead of
discovering the gap at merge time. The one-commit-per-PR squash history (the
merge signal above) keeps each branch a single reviewable unit, so
shorter-lived branches are the norm.

### Merging across a file relocation

git's rename detection re-applies your content edits onto the moved files, but it
does *not* fix *references* to the moved paths — an npm script, a `.gitattributes`
glob, or a doc link naming the old location keeps pointing there and breaks with
no conflict (a green local test on the old layout won't catch it either). After
such a merge, grep the files your branch touched for the old paths.
