# gcec rules

The project's standing working rules — injected at session start while this pack
is declared. Activity-scoped procedures live in this pack's skills
(snapshot-approval, merge-and-ci, testing-guide) and surface on
demand; the extractor-automation domain's standing rules are the "Extractor
pipeline" section below, and its scheduled tasks live under `tasks/`.

## Working rules

- **Never carry uncommitted edits onto a new branch with
  `git checkout <old-branch> -- <paths>`** — that restores the paths' *committed*
  content, silently destroying exactly the edits it was meant to preserve.
  `git checkout -b <new> origin/main` already brings a clean working tree along;
  when it can't, commit or `git stash` first and never in the same `&&` chain
  that moves the branch. In #734 the combined one-liner wiped three finished
  edits **and** invalidated the `check_the_world.mjs` + `npm run test:offline`
  pass that had just gone green, forcing a full re-verification.
- **Cap and qualify every GitHub MCP list/search call** — an unbounded one
  hard-fails the tool-result cap and costs a 2–3-call dig through the saved
  result file. `search_issues` handed a bare title string full-text-searches the
  whole repo and returns every match with its full body: the standing
  `Claudinite tracker: <Task>` lookup that opens every scheduled task blew up at
  185–211 KB three times (#734 twice, #753), and `actions_list` without a page
  cap at 155 KB (#760). Qualify the query (`in:title "Claudinite tracker:
  <Task>"`, or `list_issues` + `labels`) **and** pass a small `perPage` (5–10) —
  the answer wanted is one issue or one run, never a page of them.
- **This repo's one divergence from the canon merge recipe: CI must be green
  first** — twice for e2e/heavy-browser changes. The project mechanics of driving
  a merge (dispatching CI in a web session, the poll back-off, when to arm
  auto-merge instead of waiting) are the merge-and-ci skill — **load it for any PR a session opens**, including one
  opened incidentally mid-task by an unattended run, not only for a deliberate
  merge.
- **`npm run regen` is the regenerator** (load lists + UI snapshots +
  generic-coverage baseline/report); a stale artifact can't slip through — its
  own gate fails. On the `ours` driver (kept in sync with `.gitattributes`):
  `extension/event-extractors/load-order.generated.json` (from `npm run index`),
  `dev/requirements/<kind>/cases/*.png` (from `npm run refresh:ui`), and
  `dev/requirements/extractor/generic-coverage/generic-coverage.baseline.GENERATED.json`
  + `generic-coverage.GENERATED.md` (from the generic-coverage test). The
  inline gallery in `dev/requirements/requirements.md` is part-authored prose —
  **not** on the `ours` driver; reconcile via `npm run regen` + the gallery
  drift gate. If `regen` reports a coverage regression, that's the real gate
  firing — review it, don't paper over it.
- **Keep divergence small**: when syncing a branch to `origin/main` (by rebase —
  this repo forbids merge commits), **run `npm run regen`** as part of the sync,
  so the branch carries freshly-generated artifacts, not just the latest
  sources.
- **Whenever a change regenerates the UI gallery** (via `npm run refresh:ui`),
  link the branch's copy in the chat in the same turn you commit it —
  `https://github.com/<owner>/<repo>/blob/<branch>/dev/requirements/requirements.md`
  — for one-page review.

## Owner commands

- **"bump version"** = cut a release **end to end** — bump, merge, and wait for
  the published artifact. The bump mechanics are the canon `bump-version`
  skill's; honor an explicit target ("bump version to 1.4.0") or level ("bump
  patch" / "bump major") when given. Open the PR,
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
  infra (not a test) and stays at the root.
- **The pinned `REFERENCE_NOW`** (`dev/requirements/shared/reference-time.js`,
  currently 2026-06-01) **is the floor of the cases' dates**: author a
  neutral/upcoming case **on or after it** so it's pill-free; use a past date or
  a future year only when the case is *pinning* a pill.

## Codebase gotchas

Project-wide footguns only. Portable rules these instantiate live in the canon
packs/skills.

- **`declarativeContent`/`UrlFilter` host-match verification is CI-only** — the
  real URL→icon match runs inside Chrome, exercised here only by the CI-only
  real-Chrome test (`dev/requirements/heavy/extension-load.chrome.test.js`).
- **CDP-introspecting the MV3 worker hits the portable traps** (canon): here
  they bit `declarativeContent…getRules` (hung until job timeout), which is why
  the worker publishes `globalThis.iconRulesReady` for the test to poll.
- **The jsdom-vs-Chrome DOM traps bit this repo directly** (canon): #130/#137
  drove the **production** remedy the canon (framed for tests) leaves out —
  strip `noscript`/`script`/`style` from a clone before reading any element's
  user-facing text (the generic extractor's footer-address reader does this, #675).
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

## Workflow-failure classification

**Mind the one gap `gha/scheduled-failure-escalation` can't see:** it only
inspects workflows carrying a `schedule:`, so a workflow that is unattended by
some *other* trigger — `workflow_run`, `repository_dispatch` — needs its failure
job wired by hand.
The `Release` stub (`chrome-extension-release.yml`) is exactly that shape; its
reporters live in the vendored create-package/publish/daily workflows it calls.

## Extractor pipeline

Standing rules for the extractor-automation domain — the two gcec pack
[`tasks/`](tasks/): **create-extractor** (an `extractor-request` issue → a PR
adding site support, and the sweep that records a committed `.url`'s missing
cached page) and the weekly **generic-extractor-improvements** (read a spec only when working
on that pipeline). Adding or refreshing a cached live case by hand is the
[testing-guide](skills/testing-guide/SKILL.md) skill.

- **All page fetching goes through [`scraperapi.mjs`](tasks/create-extractor/scraperapi.mjs), from a
  task's preprocessing worker and nowhere else.** A rendered fetch through
  ScraperAPI's residential proxy (`render=true`, so a single-page app records
  post-render HTML with real data). Bot-blocking from CI/sandbox IPs is the
  portable rule maintained in the canon; here the escape hatch is the
  `SCRAPER_API_KEY` **GitHub Actions secret**, named in both tasks'
  `required_secrets` — never a local fetch (this sandbox is bot-blocked), and
  never an agent session. ScraperAPI is the whole fetching surface — swap the
  vendor in that one module if it underperforms. The aid for a flaky SPA render is
  the **`Wait-for selector`** a source request can carry
  (`extension/events-popup/derive-wait-selector.js`, a source-request tool, NOT an
  event extractor, #603), passed through as `wait_for_selector`.
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
  from `generic-extractor.js`'s `pageUsesDayFirstDates`), mirroring
  `derive-timezone.js`'s locale read; unambiguous dates (a part > 12) and the
  `.` / `-` separators are always day-first regardless (#686).
- **An unrecordable page is a dead end, not a failed run.** When a fetch can't
  produce a page (bot wall, dead URL, empty render), create-extractor's
  preprocessing labels the request `needs-human` with the reason
  and exits **0** — a task failure would converge to a `needs-human` dispatch
  issue as well, duplicating the signal and implying the pipeline broke when it
  correctly declined. Same for the pending-page sweep: the pages that did record still land.
- **The generic-coverage gate is a high-watermark over a changing case set.** A
  removed/renamed case the watermark still lists makes it stale: the local refresh re-anchors it
  (commit that); in CI it's an error to fix. *Caveat:* never commit a re-anchored
  baseline while the gate is red — a regression bundled with a case-set change can
  be re-anchored over. Detailed mechanics self-document in the gate's own headers
  (`dev/requirements/extractor/generic-coverage/generic-coverage.js` / `.test.js`).
- **To see what the core generic extractor gets ON ITS OWN** on any cached page —
  even a supported host — load the files, set `GCal.sources = []`, then call
  `GCal.extract()`: the documented way to strip every per-site override and see
  the bare base through the same norm/sort the popup uses. (`GCal.extract()`
  alone no longer answers this: the generic extractor is the base layer of every
  extraction now, so on a supported host its output already carries the site's
  overrides.) Most start/end *differences* vs a dedicated source are just its
  hardcoded `ctz` localizing to floating time (same instant), not extraction
  bugs; the real gaps are fields it can't know generically (durations,
  site-specific descriptions, and — where the page doesn't declare corroborating
  hints, see `helpers/derive-timezone.js` — `ctz`). This is the comparison the
  generic-coverage gate automates — and a case where it shows NO gap is a
  candidate for deleting the per-site source and listing the host in
  `supportedDomains`).

## Architecture rules of the road

Whenever we agree on a new or changed top-level architectural guideline, update
this section as part of the same change (the design doc itself is
`dev/procedures/highLevelDesign.md`):

- **`extension/event-extractors/custom/` is the extensibility point — one file
  per site, and nothing else.** The rest of `event-extractors/` is the pipeline
  itself: the registry, the orchestrator, the shared helpers, and the one core
  generic extractor (`generic-extractor.js`), which is a different kind of thing
  from a per-site file.
- **The core generic extractor is the base layer of every extraction** — it runs
  on every page, and a per-site source is only a layer of *overrides* merged over
  it, stating the fields it gets better. A source never re-reads what the page
  already says about itself, and the generic extractor may never know about a
  specific site.
- **Being supported is DECLARED, never derived from the extractors.**
  `supportedDomains` in `extension/host-lists.json` is the one list of hosts
  we claim, read directly by the toolbar worker and the popup. Never add a second
  list, and never register a placeholder source just to make a host count as
  supported. The only guarded direction is that every per-site source's host
  appears in the list.
- **A site we fully support gets no extractor file when there is nothing to
  override.** It stays listed in `supportedDomains` and stays fully supported —
  green icon, no correction prompt — with no file at all. When a
  `custom/<site>.js` shrinks to nothing, just delete it; when such a site starts
  needing a fix the generic extractor can't make site-agnostically, add the file
  back. Never keep a file whose only content is a restatement of the generic
  base, and never annotate one as "nothing to add".
- Adding support for a new host is the most common change — the architecture
  must keep it a single-file change: a host added to `supportedDomains`, plus —
  only when the generic extractor gets that site wrong — one self-contained new
  `extension/event-extractors/custom/<site>.js` and a regenerated load list,
  touching nothing else and assuming nothing about other extractors.

## Capture policy — lessons land in the local packs

**The gcec local pack is this repo's capture surface.** Route each lesson to its
section here: extractor-automation to the "Extractor pipeline" section,
everything else to the fitting section. Mechanism before prose, per the canon's
local promotion ladder — `test-offline-list-sync` is this pack's worked example.

**One kind never lands here, however strong the evidence** — filter on what a
lesson is *about* before picking a mechanism:

- **Claudinite loading mechanics** (which packs are declared, why a skill didn't
  mount, why an injection missed). Engine plumbing, not project knowledge — a
  real defect there goes upstream instead.

It isn't mechanically checkable, so it stays prose.
