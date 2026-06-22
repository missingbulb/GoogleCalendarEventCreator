# Executable requirements

This folder is a self-contained methodology for **executable requirements**: a way
to drive product development where every requirement is backed by a test that
proves it, the test suite fails the moment a requirement is added without a proof,
and the *expected* result of each proof is owned by the project owner — never
silently changed by an agent to make a red build go green.

It is written to **generalize**: the shape here (a numbered spec, a strict
leaf↔case bijection, kinds as a pluggable contract, owner-owned expecteds) is the
reusable pattern, not something specific to this extension.

## The five invariants

1. **Doc-first, red by default.** Adding a leaf to [`requirements.md`](requirements.md)
   fails the build until an executable case claims it. The spec drives the tests,
   not the other way around.
2. **Every leaf ⇄ exactly one case, of exactly one kind.** Enforced as a strict
   bijection by [`requirements-coverage.test.js`](requirements-coverage.test.js).
3. **Kinds are extensible.** A *kind* is one way a requirement can be asserted
   (a popup snapshot, a click behavior, a per-host extractor, …). Adding a new kind
   is a small, obvious, self-contained operation — see [Adding a kind](#adding-a-kind).
4. **Expected is owner-owned.** The success criterion of every case — a committed
   PNG, a committed JSON, or a coded assertion — is approved by the owner. An agent
   **may never edit an expected (or weaken an assertion) to turn a red requirement
   green**; on a mismatch it surfaces *actual vs expected* and asks. See
   [The owner-approval contract](#the-owner-approval-contract).
5. **A kind may be a singleton.** "The extension loads in a real browser" is a
   perfectly good requirement whose *mechanism* is one heavy/e2e test. A kind with
   a single member is fine — the mechanism is what the kind names.

## The folder is the kind

Each kind is a **top-level folder** under `dev/requirements/` containing a
`kind.js` descriptor, a `cases/` directory, an optional `expected/` directory (for
kinds whose expected is a stored artifact), and its own test runner. **The folder
is the single classifier** — a case's kind is the directory it lives in, so a case
module carries *no* `kind` field. [`shared/kinds.js`](shared/kinds.js)
auto-discovers every `<kind>/kind.js`; [`shared/cases.js`](shared/cases.js) walks
each kind's `cases/` and tags every case with its folder's `kind`/`dir`/`image`.

The kinds that ship today:

| kind | validates | runner | expected |
| --- | --- | --- | --- |
| `popup` *(default)* | a popup rendering (the real `render()`) | [`shared/render/visual-snapshots.test.js`](shared/render/visual-snapshots.test.js) | `popup/cases/<stem>.png` (pixel-exact) |
| `icon` | the toolbar icon for a URL (real worker in a fake browser) | same (shared visual engine) | `icon/cases/<stem>.png` (pixel-exact) |
| `behavior` | a click/navigation a static image can't show | [`behavior/events-view-actions.test.js`](behavior/events-view-actions.test.js) | coded assertions |
| `extractor` | a supported host's extractor against a real cached page | [`extractor/extractor-support.test.js`](extractor/extractor-support.test.js) (exact values: [`live.test.js`](extractor/live.test.js)) | `extractor/expected/<page>.json` |
| `logic` | a non-visual product/behavior rule | [`logic/product-requirements.test.js`](logic/product-requirements.test.js) | coded `verify()` |

`popup` and `icon` share one rendering/diff engine ([`shared/render/`](shared/render));
they are distinct *kinds* (different "produce the actual" code) over a common
comparison. [`shared/render/render-snapshot.js`](shared/render/render-snapshot.js)
dispatches an image case to the right renderer by its kind.

## Adding a requirement (an existing kind)

1. Add the leaf number to [`requirements.md`](requirements.md). The build is now
   **red** (no case claims it).
2. Add its one case under `<kind>/cases/`, named `<slug>.<leaf-id>.case.js` —
   `<slug>` is the section's component/feature name, `<leaf-id>` the dotted number
   (e.g. `event-cards-appearance.5.6.1.case.js`). The case supplies only the fake
   data (+ an optional DOM action or `verify()`); it does **not** declare a kind.
3. Provide the expected: render/refresh the snapshot for an image kind (and get the
   owner to approve the pixels — see below), or paste the reviewed values for an
   `extractor`/`logic` case. The build goes **green** when the leaf is both claimed
   and passing.

## Adding a kind

When a new requirement needs a *different way of asserting* than any existing kind,
adding the kind is a self-contained folder drop — nothing in the loader, the
coverage gate, or the gallery needs editing (they all iterate the registry):

1. `mkdir dev/requirements/<kind>/cases` (and `<kind>/expected` if its expected is a
   stored artifact).
2. Add `dev/requirements/<kind>/kind.js`: `module.exports = { image: <bool> }`
   (`image: true` means the expected is a committed PNG the visual engine renders &
   diffs; `false` means a JSON artifact or coded assertion).
3. Add `dev/requirements/<kind>/<kind>.test.js` — the runner that produces the
   *actual* for each of its cases and compares to the *expected*.
4. Wire that runner into the right test lane in `package.json` (e.g. add its glob to
   `test`), and add the requirement leaf(s) + a case under `<kind>/cases/`.

`tbd`: when a leaf's behavior isn't decided yet, or its faithful validation isn't
wired into the runner yet, the case sets `tbd: true` — it stays a tracked, visible
requirement that reads as *unverified here* (an image kind shows a provisional
snapshot under a "TO BE DECIDED" banner; a non-image `tbd` case names a `coveredBy`
pointer and is reported skipped). Prefer a real validation; reach for `tbd` only for
a genuinely undecided edge case or a not-yet-wired behavior.

## The owner-approval contract

The *expected* of every requirement is owned by the project owner. This is uniform
across kinds, and it takes two honest shapes:

- **Artifact-expected** (`popup`/`icon` PNG, `extractor` JSON): the owner approves a
  committed **file**. An agent may *propose* a new expected for a brand-new leaf, but
  it must **never modify a committed expected** to make a failing test pass.
- **Coded-expected** (`behavior`, `logic`, and heavy/e2e kinds): the expected *is*
  the assertion. The agent's write surface excludes the runner/`verify()` code, so it
  can't weaken the assertion to pass.

Either way the rule is one sentence: **on an actual↔expected mismatch the agent
surfaces *actual*, *expected*, and the *diff*, and asks the owner to approve or
reject — it never edits the success criterion itself.** For the visual kinds the
mechanics (revert the baseline, render the diff, ask via a popup, only re-baseline
on approval) live in
[`dev/procedures/claude/workflow.md`](../procedures/claude/workflow.md); the same
discipline applies to an `extractor` JSON diff and a `logic`/`behavior` assertion.

## Layout

```
dev/requirements/
  requirements.md                the numbered, executable spec (the contract)
  requirements-coverage.test.js  the leaf↔case bijection + kind-routing gate (the main runner)
  README.md                      this guide

  shared/                        cross-kind infra (used by ≥2 kinds)
    kinds.js                     the kind registry (auto-discovers <kind>/kind.js)
    cases.js                     loads every kind's cases/, tagging kind from the folder
    ui-requirements.js           parses requirements.md into leaf ids
    build-requirements-gallery.js + requirements-gallery.test.js   the two-column gallery
    snapshot-artifacts-dir.js    where snapshot diffs are written on failure
    gen-states-flowchart.js + popup-states-flowchart.png
    render/                      the popup+icon rendering/diff engine
      render-snapshot.js popup-renderer.js icon-renderer.js fake-chrome.js actions.js
      refresh-snapshots.js (npm run refresh:ui)  visual-snapshots.test.js  fonts/

  popup/   kind.js  cases/<slug>.<id>.case.js (+ <stem>.png)
  icon/    kind.js  cases/<slug>.<id>.case.js (+ <stem>.png)
  behavior/ kind.js events-view-actions.test.js  cases/<slug>.<id>.case.js
  logic/   kind.js  product-requirements.test.js  cases/<slug>.<id>.case.js
  extractor/
    kind.js  extractor-support.test.js  live.test.js  fallback/
    cases/<slug>.<id>.case.js      the §11 support leaves (one per host)
    expected/<page>.json           reviewed exact-value contracts (live.test.js)
    data/<page>.{html,url}         cached event-page fixtures
    page-infra/                    recorder/render helpers (refresh-cache, fetch-page,
                                   render-page, spa-shell, cdp-client + spa-shell.test.js)

  heavy/                         CI-only real-Chrome e2e (extension load, SPA render),
                                 kept out of every default test lane (no kind.js yet)
```

## Regenerating

- `npm run test:ui` — the pixel-exact popup+icon snapshot tests.
- `npm run refresh:ui` — regenerate the `<kind>/cases/*.png` snapshots + the inline
  gallery in `requirements.md` after an intentional popup/view/CSS/icon change.
  **Never** silently re-baseline a moved snapshot — surface the visual diff for the
  owner's approval (see [The owner-approval contract](#the-owner-approval-contract)
  and [`dev/procedures/claude/workflow.md`](../procedures/claude/workflow.md)).
- `npm run regen` — load lists + UI snapshots + fallback-coverage baseline.
- `npm run test:live` — the extractor live/support + fallback-coverage suites
  (offline, against the committed `extractor/data/` fixtures).

## How to add a new supported site

Adding a per-site extractor is its own documented flow — see
[`dev/procedures/claude/adding-a-source.md`](../procedures/claude/adding-a-source.md).
It adds an `extractor` leaf to `requirements.md` §11 plus a reviewed live case under
`extractor/expected/`.

## Honesty caveat

A green build means every leaf is **claimed** by a case of the right kind, **not**
that every leaf is *faithfully* verified. The `behavior` cases stub the
`chrome.tabs.create`/`window.close` boundary; many `logic` leaves are `tbd`
(covered today by unit tests, not yet wired here). These gaps are deliberate and
tracked — see the banner in `requirements.md` and
[`dev/procedures/claude/testing.md`](../procedures/claude/testing.md).
