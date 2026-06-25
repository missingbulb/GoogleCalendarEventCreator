# GitHub procedures

How we drive GitHub **in this repo**: the merge-to-main command, when to open a PR
early, the CI-interaction practices that keep a merge cheap in wall time and
tokens, and how we keep merge-conflict churn cheap across parallel branches. The
**portable** git/GitHub procedures that aren't specific to this project — the
issue → branch → PR lifecycle, commit-in-layers and the squash-merge resync rules,
the `GITHUB_TOKEN`-doesn't-trigger-a-workflow rule, unique-branch-per-run,
new-label creation, and the generic cross-branch merge gotchas — live in the
shared rules: [shared/git-and-github.md](shared/git-and-github.md). The two
owner-triggered defined instructions that also land through this PR flow — "bump
version" and "learned lessons" — keep their definitions in
[workflow.md](workflow.md) (they reference the flow here).

## Merge to main command

When the repo owner asks to merge a change to `main`, merge that branch's pull
request via **squash**, appending the PR number to the title as `(#N)` — matching
`main`'s linear, one-commit-per-PR history. CI must be green first; the
test-flakiness gate in
[shared/engineeringPractices.md](shared/engineeringPractices.md) (twice-green)
applies only when the change adds or touches an e2e/heavy-browser test.

A merge approval (like any approval) applies **only backward**, to the work
already in front of the owner when it's given — never to anything requested or
done *after* it. A later follow-up, even a fix to the just-merged change, needs
its own explicit approval before it may be merged; don't carry one approval
forward, and don't treat a chosen answer to an `AskUserQuestion` as merge
authorization because an option's wording happened to mention merging. When in
doubt, open the PR, get CI green, and wait for a fresh approval.

(The branch/commit-history rules — commit-in-layers, and the squash-merge branch
resync gotchas — are portable and live in
[shared/git-and-github.md](shared/git-and-github.md).)

## Open the PR early when a change touches e2e / heavy / UI tests

The usual default is to hold a PR until asked. **Reverse that when a change adds
or modifies an e2e/heavy-browser (`dev/requirements/heavy/`) or UI-snapshot
(`dev/requirements/{popup,icon}/`) test**: those can't be exercised locally (the sandbox has no Chrome;
see [../technicalGotchas.md](../technicalGotchas.md)), and their reviewable
artifacts only exist on a PR — CI runs the heavy/e2e suites against the branch,
and a UI change's reviewable output (the pixel diff GitHub renders, and the
inline gallery in the branch's `dev/requirements/requirements.md`) needs a branch
pushed to GitHub to view at all. So opening the PR *is* how you see the change
working and surface failures; doing it up front (rather than after a round of
local-only iteration that proves nothing for these classes) is the faster path to
a working, reviewable result. Each CI iteration costs a full round-trip, so get
the first one running as early as possible.

(Three portable CI/automation rules that used to live here — `GITHUB_TOKEN`
doesn't trigger another workflow, an automated job needs a unique branch per run,
and a workflow adding a brand-new label must create it first — now live in
[shared/git-and-github.md](shared/git-and-github.md). This repo's auto-extractor
pipeline relies on all three; see [auto-extractor.md](../this_project/auto-extractor.md).)

## Driving a merge cheaply (wall time + tokens)

Getting from a merge-to-main request to a merged PR wastes both if CI is treated
as a fixed poll-and-sleep ritual. These came out of a post-mortem on exactly that
gap:

- **Merge on an already-green check; don't trigger or wait for a duplicate
  run.** A branch `git push` already runs `test.yml` on the head commit. Opening
  a PR on that *same* commit fires a second, identical run — for a deterministic
  offline/docs change it tells you nothing new. Before waiting, check whether the
  PR head SHA already has a green required check (from the push) and merge on it.
- **Poll on a short interval; don't guess one long sleep, and don't subscribe.**
  The shell **can't observe GitHub state** here — the git remote is a git-only
  proxy (smart-HTTP under `/git/<owner>/<repo>/…`; every other path 400s), there's
  no API token in the env, and `gh` installs fine but reaches no `api.github.com`,
  so a background bash loop can't detect when a check flips and the MCP tools
  aren't callable from Bash. So you can't "wait on the condition" from a script —
  only the MCP `get_check_runs`/`get_status` poll sees the state. A single padded
  `sleep N` over- or under-shoots a run of unknown length (a blind 75s wait for a
  ~45s run was the post-mortem trigger); instead loop **MCP poll → background sleep
  → MCP poll**, until the check leaves `in_progress`, then merge. Back off the
  sleep on a rolling schedule — **5s, 10s, 15s, 30s, then 30s** repeating — so a
  fast-ending run wakes you within a few seconds while a slow one doesn't tight-poll;
  always wait for the sleep's completion notification before the next poll (firing a
  poll right after *launching* the sleep is the back-to-back waste below). And do
  **not** reach for `subscribe_pr_activity` to wait for green: its webhooks never
  deliver CI **success** (only failures/comments/reviews), so the green transition
  you're waiting for never arrives — it's for babysitting a PR, not merge-on-green.
- **Never tight-poll.** *Tight* means back-to-back status calls with no sleep
  between — pure token waste (as is re-reading a background job's output file after
  its completion notification already fired). The short-interval poll loop above is
  not tight-polling: each poll is separated by a real sleep.
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
can't slip through — its own test fails: the load-order drift guard
(`dev/tools/test/load-order-generated.test.js`), the UI snapshot pixel diff, or
the fallback-coverage gate.

Files under this rule (kept in sync with `.gitattributes`):

- `extension/event-extractors/load-order.generated.json` — from `npm run index`.
- `dev/requirements/<kind>/cases/*.png` — from `npm run refresh:ui`. (The inline gallery in
  `dev/requirements/requirements.md`, also refreshed by that script, is part-authored prose,
  so it is **not** on the `ours` driver — its image lines are reconciled by `npm
  run regen` + the gallery drift gate, not by taking one side.)
- `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json` and
  `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` — from the
  fallback-coverage test, which `npm run regen` runs (it rewrites them locally;
  in CI the gate is read-only). If `regen` reports a coverage regression here,
  that's the real gate firing — review it, don't paper over it.

### One-time local git setup

The `ours` driver and conflict-replay are per-clone git config, not committed.
`.claude/cloud-setup.sh` sets them in the cloud sandbox; on a local clone run
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
merge-to-main command above) keeps each branch a single reviewable unit, so
shorter-lived branches are the norm.

The generic cross-branch merge gotchas that aren't specific to this repo's
generated files — merging across a file relocation, merging in content that
predates a branch-wide invariant, and porting old work forward across a changed
invariant — live in the shared rules:
[shared/git-and-github.md](shared/git-and-github.md).

## Renaming a directory that houses a submodule

- **`git mv` on a directory containing a submodule updates `.gitmodules` and the
  index but leaves `.git/config` stale — run `git submodule sync && git submodule
  update --init` after.** When `docs/claude/shared/` (the Claudinite submodule)
  moved to `dev/procedures/claude/shared/` via `git mv docs dev/procedures`, git
  correctly rewrote `.gitmodules` and the index; but the local `.git/config` still
  had `[submodule "docs/claude/shared"]` pointing at the old path. Until `git
  submodule sync` propagated the new path into `.git/config` and `git submodule
  update --init` re-registered it, any operation that consulted `.git/config`
  (submodule status, checkout) saw the stale entry. Always run both commands after
  renaming a directory that houses a submodule.

## Re-read a file after `git mv` before rewriting it

- **`git mv` leaves the moved file looking unread to the editor tool — a
  `Write`/`Edit` in the same batch silently refuses, leaving the file stale.** The
  common reorg move is `git mv old new` then rewrite `new`; the editor tracks reads
  by path, so the moved path reads as never-seen and the write is rejected. Re-read
  the file at its **new** path before editing it. And check each result in a batched
  set of tool calls: a single refused write (or any silent failure) buried in a batch
  is easy to miss, and the stale (moved-but-not-rewritten) file surfaces much later
  as a confusing error far from its cause — here a relocated module kept its old
  contents and `ENOENT`'d at load two steps downstream.
