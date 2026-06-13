# Workflow

For every new task in this repo:

1. Create a GitHub issue describing the task before starting work.
2. Reference that issue number in commit messages (e.g. `Refs #123` or
   `Fixes #123`).
3. Update the issue's status (comments / close) as work progresses and
   when it's done.

# Testing

`npm test` runs everything; `README.md` "Testing" has the mechanics. Keep
these decisions in mind:

- **Add an integration case** (`test/integration/cases/`) whenever you add or
  change support for a site, or fix an extraction bug — one real, focused event
  page per distinct behavior. For logic that doesn't depend on a third-party
  page (date math, URL building, parsing), prefer a `test/unit/` test instead.
- **New HTML snapshots** can't be fetched here (no internet, so `npm run
  refresh` won't work): add the case file with its `url`, push, then run the
  **Refresh snapshots** workflow to fetch and commit the snapshot + manifest
  entry. Then fill in the case's exact `expected` from a `test:live` run.
- **UI changes** (popup or toolbar icon) need their snapshot captured for future
  comparison: regenerate the stored PNGs with `npm run refresh:ui` (or the
  **Refresh UI snapshot** workflow) and commit them so the diff shows the
  before/after. A new UI surface needs a new snapshot of its own.
