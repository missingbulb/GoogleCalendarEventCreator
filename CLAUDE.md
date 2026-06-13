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

- **Integration cases are the reviewed contract.** A person reads
  `test/integration/cases/` to confirm the behavior is right; nobody reviews the
  unit tests. So every required change or bugfix must be covered by an
  integration case — add or update one whenever you add/change support for a
  site or fix an extraction bug (one real, focused event page per distinct
  behavior). Unit tests (`test/unit/`) are a supplementary safety net for logic
  that doesn't depend on a third-party page (date math, URL building, parsing),
  not a substitute.
- **Keep integration cases as simple as possible.** This matters a lot, because
  they're what gets reviewed: minimal, representative pages; no incidental
  complexity; one behavior per case rather than sprawling catch-alls.
- **New HTML snapshots** can't be fetched here (no internet, so `npm run
  refresh` won't work): add the case file with its `url`, push, then run the
  **Refresh snapshots** workflow to fetch and commit the snapshot + manifest
  entry. Then fill in the case's exact `expected` from a `test:live` run.
- **UI changes** (popup or toolbar icon) need their snapshot captured for future
  comparison: regenerate the stored PNGs with `npm run refresh:ui` (or the
  **Refresh UI snapshot** workflow) and commit them so the diff shows the
  before/after. A new UI surface needs a new snapshot of its own.
