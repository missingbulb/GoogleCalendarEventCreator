# Workflow

For every new task in this repo:

1. Create a GitHub issue describing the task before starting work.
2. Reference that issue number in commit messages (e.g. `Refs #123` or
   `Fixes #123`).
3. Update the issue's status (comments / close) as work progresses and
   when it's done.

# Testing

Run the suites with `npm test` (offline unit + live integration + UI). See
`README.md` "Testing" for the full mechanics; the guidance below is about
*what* to add and *how* to refresh snapshots — especially when this
environment has no internet to fetch pages locally.

## Integration tests (`test/integration/`) — what's crucial to cover

- Each case (`test/integration/cases/<case>.json`) pins the *complete, exact*
  extractor + URL-builder output for one real event page: `title`, `start`,
  `end`, `location`, `multipleEvents`, `dates`, `details`, `calendarUrl`,
  `eventCount`, `ctz`. Every field must match exactly.
- Add a new case whenever you add or change support for a site/platform, or
  fix an extraction bug. Pick a real, representative event page that exercises
  the behavior — a new host, a multi-performance/`multipleEvents` page, an
  unusual date/timezone format. Prefer one focused case per distinct behavior
  over many near-duplicates.
- For logic that does *not* depend on a third-party page (date math, Calendar
  URL building, parsing helpers), prefer a unit test in `test/unit/` instead:
  it stays deterministic and can't be broken by a site changing its markup.

## Tasks that need a new HTML snapshot

The live tests run offline against committed snapshots
(`test/integration/snapshots/<case>.html` + `manifest.json`). Fetching a
snapshot needs internet, which this environment usually lacks — do **not** rely
on `npm run refresh` here. Instead:

1. Add `test/integration/cases/<case>.json` with the `url` (and a
   `description`). Commit and push.
2. Run the **Refresh snapshots** workflow
   (`.github/workflows/refresh-snapshots.yml`) via "Run workflow"
   (workflow_dispatch). It fetches the page, commits `<case>.html`, and records
   the URL + fetch time in `manifest.json` (the manifest entry is generated
   from the case file's `url`, not edited by hand).
3. Pull the committed snapshot, run `npm run test:live` to see the actual
   extracted values in the failure output, and copy them into the case's
   `expected`. Commit.

When an existing case's URL changes or its page content drifts, update the
case `url`/`expected` and re-run that workflow the same way.

## UI tests (`test/ui/`) — when to add a screenshot snapshot

The UI tests render the popup and the toolbar icons (no browser; satori +
resvg) and compare them pixel-for-pixel against stored PNGs in
`test/ui/snapshots/`. For any change that affects what the popup or toolbar
icon *looks like*:

- Touching `popup.html`, `popup.js`, the popup fixture/markup, `icon-state.js`,
  `tools/gen_icons.py`, or the icon assets is a UI change — capture the
  expected result so future runs can compare against it. After an *intentional*
  change, regenerate the stored images with `npm run refresh:ui` locally, or
  run the **Refresh UI snapshot** workflow
  (`.github/workflows/refresh-ui-snapshot.yml`). Commit the updated PNG(s) so
  reviewers see the before/after in the diff.
- For a genuinely new UI surface (a new popup state, a new icon variant), add a
  new rendered fixture **and** a stored snapshot following the pattern in
  `test/ui/popup.test.js` / `test/ui/icon.test.js`, so the new appearance is
  locked in for future comparison.
- The icon test also cross-checks the generated icon against the shipped
  `icons/*.png`; if you change icon generation, regenerate both
  (`tools/gen_icons.py` and `npm run refresh:ui`).
