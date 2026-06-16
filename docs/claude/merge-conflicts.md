# Avoiding merge-conflict churn across parallel branches

Working in parallel sessions / multiple branches is normal here, and the
conflicts cluster on a few files every branch regenerates. These rules keep them
cheap.

## Generated files are regenerated, never hand-merged

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
- `test/ui/cases/*.png` — from `npm run refresh:ui`.
- `test/integration/fallback-coverage.baseline.GENERATED.json` and
  `docs/fallback-coverage.GENERATED.md` — from the fallback-coverage test, which
  `npm run regen` runs (it rewrites them locally; in CI the gate is read-only).
  If `regen` reports a coverage regression here, that's the real gate firing —
  review it, don't paper over it.

## One-time local git setup

The `ours` driver and conflict-replay are per-clone git config, not committed.
`scripts/cloud-setup.sh` sets them in the cloud sandbox; on a local clone run
once:

```
git config rerere.enabled true     # replay a resolution the next time it recurs
git config merge.ours.driver true  # the driver .gitattributes maps generated files to
```

Without them nothing breaks — the generated files just fall back to a normal
(manual) conflicting merge.

## Keep divergence small

Conflict size scales with how long a branch lives and how far it drifts from
`main`. Sync early rather than at the end: when starting work on a branch,
`git merge origin/main` (or rebase) and `npm run regen` first, so the branch
carries the latest sources and freshly-generated artifacts instead of
discovering the gap at merge time. The one-commit-per-PR squash history
(`docs/claude/workflow.md`) keeps each branch a single reviewable unit, so
shorter-lived branches are the norm.
