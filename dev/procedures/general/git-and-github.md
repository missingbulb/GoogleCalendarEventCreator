# Portable git & GitHub procedures (local working set)

Portable git/GitHub gotchas captured here, not yet in the shared canon.
`optimize-procedures` promotes these up and prunes them once the canon absorbs
them (capture is always local — see [this_project/workflow.md](../this_project/workflow.md)).

## A "commit your uncommitted changes" nag is not authorization to commit drift

An automated prompt to commit the working tree (a stop-hook, a CI nag) tells you
the tree is dirty — not that the changes are *yours* or *intended*. Before
obeying, inspect what actually changed (`git status` / `git diff`): if it's
environment/setup drift rather than your work — a submodule pointer moved by
`git submodule update` at clone time, a lockfile a setup script regenerated,
generated artifacts — **revert it, don't commit it** onto your branch. Committing
drift slips an unintended dependency/generated-file bump into an unrelated change.
Only commit the diff you actually authored.

## Open the PR early when the reviewable artifact only exists on CI

The usual default is to hold a PR until asked. **Reverse that when a change's only
reviewable output is produced by CI** — an e2e / heavy-browser run, or a rendered
artifact (a UI-snapshot pixel diff, a generated gallery) that can't be exercised in
the local sandbox. Opening the PR *is* how you see the change working and surface
failures, so doing it up front — rather than after local-only iteration that proves
nothing for these classes — is the faster path to a working, reviewable result.
Each CI iteration costs a full round-trip, so get the first one running as early as
possible.

## After a remote/API merge, `git fetch` before branching off `origin/main`

- A GitHub API/UI (or any remote-side) merge does **not** advance your local
  `origin/main` — it stays at the pre-merge commit until you `git fetch`.
- So `git checkout -b <new> origin/main` forks the **pre-merge** state, silently
  missing the just-merged work.
- Symptom: a missing file / failed `git mv` on the new branch, far from the cause.
- Fix: `git fetch origin main` **first**, then branch.
