# Engineering practices (local working set)

General software-engineering-practice lessons captured **in this repo** that
haven't (yet) been promoted into the shared canon. The curated, project-agnostic
canon lives read-only in the Claudinite submodule —
[claude/shared/engineeringPractices.md](claude/shared/engineeringPractices.md) —
which is what the rest of the docs link to.

This file is a **local capture surface**: the "learned lessons" command and the
daily auto-lessons digest write new engineering-practice insights here (capture is
always local — see [claude/workflow.md](claude/workflow.md)). The daily
**optimize-procedures** routine
([claude/auto-optimize-procedures.md](claude/auto-optimize-procedures.md)) is the
only thing that bridges to Claudinite: it promotes generalizable items from here
up (via a `claudinite-lesson` issue) and, once the canon absorbs them and the
submodule pin updates, prunes them from this file. So this doc stays small —
usually just whatever is captured-but-not-yet-upstreamed.

- **A CI job that reads submodule files must fetch submodules in the checkout step.** `actions/checkout` does not fetch submodules by default — without `submodules: true` (or `recurse-submodules: true`) the submodule folder is an empty directory in CI, and any gate that reads it passes vacuously. The symptom is a green check that validates nothing (e.g. a Dependabot bump PR whose CI was a no-op until the `test.yml` checkout was fixed — #444). Add the flag to every CI job whose tests read submodule content.
- **When retrofitting a clock/date-relative rule into a golden-snapshot suite, the pinned reference instant controls the blast radius — choose it to minimize incidental churn.** A date-dependent rendering rule (e.g. a "past" badge keyed on "before today") moves every fixture whose date crosses the new threshold relative to the pinned "now". Pin the reference so existing fixtures land on the *same* side they were authored for (e.g. at the floor of their dates), so only the cases that deliberately exercise the new rule change and the diff stays small and reviewable — instead of a sprawling, hard-to-review baseline churn that buries the intended change.
- **A bug report you can't reproduce against HEAD may already be fixed but unreleased — check the SHIPPED version before theorizing about the cause.** A user runs the released build, not your checkout. When a reported behavior doesn't reproduce against `main`, compare the manifest/`package.json` version to the latest release and `git log -S"<the logic>"` the relevant code before inventing explanations. In #507 the "past" pill not showing was the released v1.3.0 deciding it by *year only*; the same-year fix had already merged to `main` but wasn't released — several wrong "mid-day / viewed-before-the-event" theories would have been skipped by checking the version first.
- **`gh pr view` succeeds for CLOSED PRs — use `gh pr list --state open` to detect an open PR.** In automation scripts that gate "create a PR only if one doesn't already exist", `gh pr view <branch>` returns success (exit 0 and PR data) even when the branch's PR is closed. A re-triggered pipeline on a branch whose prior run left a closed PR will skip `gh pr create` and surface the stale closed link as the "ready for review" result — as happened on a re-run of #276 which pointed at the already-closed #278. Test for an open PR explicitly: `gh pr list --head <branch> --state open` (non-empty output = open PR exists). (#521)
- **GitHub fires ALL `issues:labeled` workflows on every label event — add a `run-name` to distinguish them in the Actions sidebar.** When multiple workflows share `on: issues: types: [labeled]`, GitHub can't filter by label name at the trigger level, so every workflow runs on every label application and defaults to the same display title (e.g. the issue title). This makes them indistinguishable in the Actions sidebar when triaging a failure. Adding a distinct top-level `run-name` per workflow (e.g. `"Auto-Implement: Prepare — ${{ github.event.issue.title }}"`) makes the phase immediately clear — display-only, zero logic change. (#522)
