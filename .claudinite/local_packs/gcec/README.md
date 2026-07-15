# gcec pack (local)

This project's general working pack — a **local pack**
(`.claudinite/local_packs/` — tracked project content, run by the same
Claudinite engine as the canon packs). It replaced the always-`@`-imported
`dev/procedures/{workflow,github,testing,technicalGotchas}.md` docs: the
always-relevant rules became [RULES.md](RULES.md) (injected at session start),
the activity-scoped procedures became this pack's skills (surfaced on demand),
and the first always-testable rule became a check. Declared by hand in
[`.claudinite-checks.json`](../../../.claudinite-checks.json); never
fingerprinted or seeded.

## Contents

| Slot | What |
|---|---|
| Prose | [RULES.md](RULES.md) — working rules, owner commands, testing invariants, codebase gotchas, workflow-failure classification, architecture rules of the road, the capture policy |
| Checks | [test-offline-list-sync](test-offline-list-sync.mjs) (+ red-first fixtures in [pack.test.mjs](pack.test.mjs), run by this repo's own `npm test`) |
| Daily tasks | none |
| Skills | [snapshot-approval](skills/snapshot-approval/SKILL.md) · [merge-and-ci](skills/merge-and-ci/SKILL.md) · [testing-guide](skills/testing-guide/SKILL.md) |

## Rules

| Rule (≤5 words) | How enforced |
|---|---|
| test:offline list matches tree | **hardcoded** (`test-offline-list-sync`) |
| Squash merges, `(#N)`, approval-backward | prose (+ canon squash checks) |
| Generated files: regen, never hand-merge | prose (+ each artifact's own gate) |
| Branch start: merge main + regen | prose |
| Gallery regenerated → link in chat | prose |
| Snapshot moves need owner approval | skill (snapshot-approval) |
| bump version = full release | prose (owner command) |
| learned lessons = canon pass | prose (owner command) |
| Integration cases are the contract | prose |
| Mirror tree, one test per file | prose (list half is the check) |
| Pin cases to REFERENCE_NOW floor | prose |
| Refusal tests: mutate the guard | prose |
| MV3/jsdom/GCal/clean() gotchas | prose (see RULES.md) |
| Unattended workflows wire the reporter | prose |
| Single-file-per-host architecture | prose |
| Capture into the owning pack | prose (the policy itself) |
