# gcec rules

The project's standing working rules — injected at session start while this pack
is declared. Activity-scoped procedures live in this pack's skills
(snapshot-approval, merge-and-ci, testing-guide, add-live-case) and surface on
demand; the extractor-automation domain's standing rules are the "Extractor
pipeline" section below, and its two routines live under `dev/routines/`.

## Working rules

- **Merges to `main` are squash, `(#N)` appended to the title** — a linear,
  one-commit-per-PR history. CI must be green first (twice for e2e/heavy-browser
  changes). The project mechanics of driving a merge (dispatching CI in a web
  session, the poll back-off) are the merge-and-ci skill.
- **Generated files are regenerated, never hand-merged.** On a conflict take
  either side and rerun `npm run regen` (load lists + UI snapshots +
  fallback-coverage baseline/report). The committed `.gitattributes` maps each
  generated file to the `ours` merge driver; a stale artifact can't slip through
  — its own gate fails. Under the rule (kept in sync with `.gitattributes`):
  `extension/event-extractors/load-order.generated.json` (from `npm run index`),
  `dev/requirements/<kind>/cases/*.png` (from `npm run refresh:ui`), and
  `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json`
  + `fallback-coverage.GENERATED.md` (from the fallback-coverage test). The
  inline gallery in `dev/requirements/requirements.md` is part-authored prose —
  **not** on the `ours` driver; reconcile via `npm run regen` + the gallery
  drift gate. If `regen` reports a coverage regression, that's the real gate
  firing — review it, don't paper over it.
- **One-time local git setup** (the cloud sandbox gets it from
  `.claudinite/shared/engine/hooks/environment-setup-command.sh`): `git config rerere.enabled true`
  and `git config merge.ours.driver true`. Without them nothing breaks — the
  generated files just fall back to a manual conflicting merge.
- **Keep divergence small**: when starting work on a branch, `git merge
  origin/main` (or rebase) **and run `npm run regen`** first, so the branch
  carries freshly-generated artifacts, not just the latest sources.
- **Whenever a change regenerates the UI gallery** (via `npm run refresh:ui`),
  link the branch's copy in the chat in the same turn you commit it —
  `https://github.com/<owner>/<repo>/blob/<branch>/dev/requirements/requirements.md`
  — for one-page review. A moved snapshot baseline needs owner approval, never
  silent regeneration: the process is the snapshot-approval skill.

## Owner commands

- **"bump version"** = cut a release **end to end** — bump, merge, and wait for
  the published artifact. Raise `version` in **both** `extension/manifest.json`
  and `package.json` (kept identical by the `shared-constants` check), on a
  branch. Default to a **minor** bump; honor an explicit target ("bump version
  to 1.4.0") or level ("bump patch" / "bump major") when given. Open the PR,
  get CI green, squash-merge with `(#N)` —
  saying "bump version" is itself the merge authorization for **this**
  deterministic bump PR only. The merge triggers **Release: Create Package**;
  do **not** report done until the `vX.Y.Z` GitHub Release with its refreshed
  `google-calendar-event-creator.zip` asset is published — poll via the GitHub
  MCP tools on the merge-and-ci skill's back-off (reporting at merge time races
  the async build).
- **"learned lessons"** = run the canon lessons-learned pass over the current
  conversation on **the strongest model available**, plus the standing
  efficiency analysis of the conversation's tool/process usage. Only when the
  owner asks — never extract unprompted. Capture routing: see below.

## Testing invariants

- `npm test` runs everything; `test:live` (reviewed integration cases against
  cached pages), `test:offline` (unit), `test:ui` (popup/icon snapshots),
  `refresh:ui` (regenerate after an intentional UI change), `test:e2e` (heavy,
  CI-only). The suites, harnesses, and requirements model are mapped in the
  testing-guide skill.
- **Integration cases are the reviewed contract** — a person reads
  `dev/requirements/extractor/expected/`; nobody reviews the unit tests. Every
  required change or bugfix gets a case (one real, focused page per distinct
  behavior; keep cases minimal). Unit tests under `extension-test/` are a
  supplementary safety net for page-independent logic.
- **`extension-test/` mirrors `extension/`'s tree, one test per source file**
  (`extension/<area>/<name>.js` → `extension-test/<area>/<name>.test.js`; the
  path IS the link, so a source file never names its test). Deliberate
  departures: `extension-test/integration/` for whole-extension/interaction
  tests; no mirror for `custom/*` sources or data/markup files (covered by live
  cases / snapshots / drift guards); `extension-test/harness.js` is shared
  infra (not a test) and stays at the root. The hand-kept `test:offline` list in
  `package.json` is enforced against the tree by this pack's
  `test-offline-list-sync` check.
- **Requirement tests render against the pinned `REFERENCE_NOW`**
  (`dev/requirements/shared/reference-time.js`, currently 2026-06-01), never the
  wall clock. The pinned day is the floor of the cases' dates: author a
  neutral/upcoming case **on or after it** so it's pill-free; use a past date or
  a future year only when the case is *pinning* a pill.

## Codebase gotchas

Project-wide footguns only — a trap you'd only hit *while editing one specific
file* belongs in that file's top-of-file header comment (see the capture policy
below). Portable rules these instantiate live in the canon packs/skills.

- **`declarativeContent`/`UrlFilter` host-match verification is CI-only** — the
  lookalike-`hostSuffix` gotcha and the `hostEquals` + dot-`hostSuffix`
  apex-or-subdomain fix are the canon `chrome-extension` pack's; the real
  URL→icon match runs inside Chrome, exercised here only by the CI-only
  real-Chrome test (`dev/requirements/heavy/extension-load.chrome.test.js`).
- **CDP-introspecting the MV3 worker hits the portable traps** (canon): here
  they bit `declarativeContent…getRules` (hung until job timeout), which is why
  the awaited signal is built from plain promises and the worker publishes
  `globalThis.iconRulesReady` for the test to poll. Bound every probe and add a
  test-level timeout regardless.
- **The jsdom-vs-Chrome DOM traps bit this repo directly** (canon): #130/#137
  drove the **production** remedy the canon (framed for tests) leaves out —
  strip `noscript`/`script`/`style` from a clone before reading any element's
  user-facing text (the fallback's footer-address reader does this, #675).
- **Injected block markup inside a `<p>` silently empties it** — the parser
  auto-closes the `<p>` and the content lands as its `nextElementSibling`; a
  `.foo p` selector reads `""` with no error. Bit tel-aviv's description blocks
  (#602) — read the sibling, not the tag.
- **The augment-not-replace + reset-per-load rule lands on `GCal` here**
  (canon): `registry.js` resets `GCal.sources` on load and is pinned **first**
  in the load order so it runs before any source pushes (#48, #189).
- **`clean()` collapses all whitespace including newlines — single-line fields
  only.** A description run through it loses every line break (#131, #140,
  #141); multi-line text goes through the block helpers (`blockText` /
  `normalizeBlock` / `htmlToText`). Line-break handling is generic, never a
  per-source choice.
- **A supported/registered host is necessary but not sufficient for "an
  event"** — gating on `Boolean(site)` surfaced phantom events on home pages
  (#133); a real event requires actual data (JSON-LD or a parsed date), never a
  mere host match.
- **The vendored `.claudinite/shared` canon reflects its stamp, not canon
  `main`** — check the `claudinite` stamp in `.claudinite-checks.json` (and
  whether the nightly refresh has run since an upstream fix merged) **before**
  concluding an upstream fix hasn't arrived and **before committing a
  workaround for a check finding** (an accept, a suppression pragma): a stale
  canon twice produced spurious findings whose fixes had already merged
  (#664, #665).
- **The cloud Setup script runs as root starting in the repo's parent dir**,
  not the checkout — a bare `npm ci` there silently installs nothing;
  `.claudinite/shared/engine/hooks/environment-setup-command.sh` `cd`s into the checkout first
  (#186/#196).

## Workflow-failure classification

An unattended workflow must converge its failure to a human-visible state (the
rule and the `report-failure` reporter live in the canon). This repo's
classification: the `Release` stub (`chrome-extension-release.yml`) is
unattended and already covered — the reporters fire inside the vendored
create-package/publish/daily workflows, keyed per operation, with per-repo
values in `.github/release.config`; `test.yml` is attended PR CI — no reporter;
`fetch-page.yml` is attended by its dispatcher (see the extractor pipeline
section below); a **new** unattended workflow adds a failure job per the canon
action header's recipe.

## Extractor pipeline

Standing rules for the extractor-automation domain — the create-extractor routine
(an `extractor-request` issue → a PR adding site support), still under
[`dev/routines/`](../../../dev/routines/), and the daily
fallback-extractor-improvements task, now a gcec pack task under
[`tasks/`](tasks/fallback-extractor-improvements/) (read a spec only when working
on that pipeline). Adding a cached live case is the
[add-live-case](skills/add-live-case/SKILL.md) skill.

- **All page fetching is delegated to ScraperAPI via the fetch-page workflow**
  (`.github/workflows/fetch-page.yml`): a bare curl through ScraperAPI's
  residential proxy with `render=true`, so a single-page app records post-render
  HTML with real data. Bot-blocking from CI/sandbox IPs is the portable rule
  maintained in the canon; here the escape hatch is the `SCRAPER_API_KEY`
  **GitHub Actions secret** — a page is recorded by dispatching that workflow (the
  create-extractor routine does this in its step 4), never by a local fetch (this
  sandbox is bot-blocked). ScraperAPI is the whole fetching surface — swap the
  vendor in that one workflow if it underperforms. The aid for a flaky SPA render
  is the **`Wait-for selector`** a source request can carry
  (`extension/events-popup/derive-wait-selector.js`, a source-request tool, NOT an
  event extractor, #603), passed to the workflow as `wait_for_selector`.
- **Facebook can't be a cached live case** — a hard HTTP 400 even through the
  proxy, so its extraction stays unit-tests-only
  (`extension-test/event-extractors/extraction.test.js`).
- **Rendered output isn't deterministic.** A re-record can legitimately shift a
  live case's `expected` — treat such drift like a site-markup change, and prefer
  extracting JSON-LD/`og:` (which apps still inject) over brittle DOM positions.
- **An ambiguous numeric slash date is read by the page's declared locale,
  centrally — never per-source, never guessed.** `"05/07/2026"` (both parts ≤ 12)
  reads month-first by default (V8's US convention) and flips day-first only on a
  *positive* non-US signal — an explicit non-US region in `<html lang>` /
  `og:locale`, or a non-English language; a bare `en` (region unknown) stays
  month-first rather than guess. Resolution lives in `helpers/dates.js`
  (`parseDateFromText` / `normalizeDateValue` take a `dayFirst` flag, threaded
  from `extract-unsupported.js`'s `pageUsesDayFirstDates`), mirroring
  `derive-timezone.js`'s locale read; unambiguous dates (a part > 12) and the
  `.` / `-` separators are always day-first regardless (#686).
- **`fetch-page.yml` is attended by its dispatcher** (the workflow-failure
  classification above): the create-extractor routine dispatches it, polls the
  run, and on failure labels the issue `extractor-blocked-needs-human` — a red run
  reaches a human through the routine, not the Actions list, so the workflow
  carries no failure reporter (and being dispatch-only it never runs unwatched).
- **The fallback-coverage gate is a high-watermark over a changing case set.** It
  ratchets up on an unchanged case set and re-anchors when the set changes,
  compared over the cases the runs **share** — so adding an extractor never fails
  it (#240) while a pre-existing case that regresses still does. A removed/renamed
  case the watermark still lists makes it stale: the local refresh re-anchors it
  (commit that); in CI it's an error to fix. *Caveat:* never commit a re-anchored
  baseline while the gate is red — a regression bundled with a case-set change can
  be re-anchored over. Detailed mechanics self-document in the gate's own headers
  (`dev/requirements/extractor/fallback/fallback-coverage.js` / `.test.js`).
- **To see what the generic/unsupported extractor gets** on any cached page — even
  a supported host — load the files, set `GCal.sources = []`, then call
  `GCal.extract()`: the documented way to force the unsupported-host path through
  the same norm/sort the popup uses. Most start/end *differences* vs a dedicated
  source are just its hardcoded `ctz` localizing to floating time (same instant),
  not extraction bugs; the real gaps are fields it can't know generically
  (durations, site-specific descriptions, and — where the page doesn't declare
  corroborating hints, see `helpers/derive-timezone.js` — `ctz`). This is the
  comparison the fallback-coverage gate automates.

## Architecture rules of the road

Whenever we agree on a new or changed top-level architectural guideline, update
this section as part of the same change (the design doc itself is
`dev/procedures/highLevelDesign.md`):

- Adding support for a new host is the most common change — the architecture
  must keep it a single, self-contained new file
  (`extension/event-extractors/custom/<site>.js`) plus regenerating the load
  list, touching nothing else and assuming nothing about other extractors.

## Capture policy — lessons land in the local packs

**The gcec local pack is this repo's capture surface.** Route each lesson to its
section here (extractor-automation to the "Extractor pipeline" section,
everything else to the fitting section) — then pick the *mechanism* before
writing prose (the canon promotion ladder, applied locally): a check in the
pack's `rules` beats prose every time (`test-offline-list-sync` is the worked
example — a
testable sentence became a rule module with red-first fixtures); an
activity-scoped procedure becomes a pack skill; only what neither can carry
lands in RULES.md, terse.

- **File-local footguns go in the file, not here.** A trap you'd only trip
  *while editing one specific file* (a mistake of **commission**, made with the
  file open) belongs in that file's top-of-file header comment — on-demand
  context, can't drift, off the always-loaded budget. Keep it central here only
  when Claude could hit it *without* reading the locus file (a mistake of
  **omission**, or a cross-cutting invariant). One file can split both ways:
  the jsdom traps stay here (generic extraction hits them without reading the
  harness) while `extension-test/harness.js`'s own parsing mechanics live in
  its header.
- **Portable lessons are captured here too** — locally, in the owning pack,
  exactly like project-specific ones. Portability is the Claudinite canon's
  concern (its growth routine generalizes local packs into shared canon and
  prunes what the canon comes to cover); never edit the read-only mount or
  reach across to Claudinite from here.
- Keep every addition terse; dedupe against the canon before adding.
