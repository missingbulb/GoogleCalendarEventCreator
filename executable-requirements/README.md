# Executable requirements

This folder holds **everything requirements-related** — the requirement
documents and every test that validates them — in one place. The guiding idea:
a requirement isn't real until it has an **external validation** (a test) that
proves it. So the spec and its proof live together, and a green build means every
leaf requirement is *claimed* by a case (see the honesty caveat at the end).

## The document model

[`Requirements.md`](Requirements.md) is a **numbered breakdown**. Two roles:

- A **top-level requirement** (a `##` section, e.g. "§5 Event cards — appearance")
  may carry a short prose **"how it works"** explanation of a feature or
  feature-set. It is *not* directly tested.
- A **leaf** (a requirement with no finer-grained child — `5.6.1` is a leaf,
  `5.6` is not because `5.6.1` exists) **must have exactly one case** that
  externally validates it. The strict bijection "every leaf ↔ exactly one case"
  is enforced by [`ui-requirements-coverage.test.js`](ui-requirements-coverage.test.js).

So the doc can read top-down: several top-level requirements, each a couple of
sentences of explanation, with the testable detail in the deeper breakdown — and
every one of those deep leaves is backed by an executable case.

[`productRequirements.md`](productRequirements.md) is the readable **feature
overview**; its numbered, testable content was converted into `Requirements.md`
§12–§16.

## The rule: a new requirement defines its validation

**Adding a requirement means adding its external validation test in the same
change.** Add a leaf number in `Requirements.md`, then add its one case under
[`ui/cases/`](ui/cases/), named `<slug>.<leaf-id>.case.js` — where `<slug>` is the
section's component/feature name and `<leaf-id>` is the dotted number (e.g.
`event-cards-appearance.5.6.1.case.js`). The case declares **how** it's verified
via its `kind`:

| `kind` | Validates | Verified by | Image? |
| --- | --- | --- | --- |
| `popup` *(default)* | a popup rendering (the real `render()`) | snapshot — [`ui/popup-snapshots.test.js`](ui/popup-snapshots.test.js) | yes (`<stem>.png`) |
| `icon` | the toolbar icon for a URL (the real worker in a fake browser) | snapshot — same | yes |
| `behavior` | a click/navigation a static image can't show | [`ui/events-view-actions.test.js`](ui/events-view-actions.test.js) | no |
| `extractor` | a supported host's extractor against a real cached page | [`extractors/extractor-support.test.js`](extractors/extractor-support.test.js) | no |
| `logic` | a non-visual product/behavior rule | [`product-requirements.test.js`](product-requirements.test.js) | no |

The single dispatcher [`infrastructure/render-snapshot.js`](infrastructure/render-snapshot.js)
turns a case into a PNG by its `kind` (only the image kinds have a renderer);
[`infrastructure/build-requirements-gallery.js`](infrastructure/build-requirements-gallery.js)
embeds each leaf in the two-column gallery in `Requirements.md` — an image for an
image kind, a note for a non-image kind.

### `tbd` / untested

When a leaf's correct behavior **isn't decided yet** (an edge case), or its
validation **isn't wired into the executable runner yet**, mark the case
`tbd: true`. It stays a tracked, visible requirement that reads as *unverified
here* rather than silently absent:

- an image kind shows a provisional snapshot under a "TO BE DECIDED" banner;
- a `logic` (or `extractor`) `tbd` case carries a `coveredBy` pointer to the test
  that covers the behavior **today** (e.g. a unit test), and its runner reports it
  **skipped**.

Prefer a real validation; reach for `tbd` only for a genuinely undecided edge case
or a not-yet-wired behavior, and wire it later (a tracked follow-up).

## Layout

```
executable-requirements/
  Requirements.md              the numbered, executable spec (the contract)
  productRequirements.md       feature-level overview (defers detail to Requirements.md)
  README.md                    this guide
  ui/
    cases/                     every leaf's case: <slug>.<id>.case.js (+ <stem>.png for image kinds)
    fonts/                     bundled fonts for the snapshot renderer
    popup-snapshots.test.js    the pixel-exact snapshot engine (popup + icon)
    events-view-actions.test.js  the behavior (click) leaves
    requirements-gallery.test.js the two-column gallery gate
  extractors/
    custom/                    reviewed per-page live cases (description + expected)
    fallback/                  the generic-fallback coverage gate (+ GENERATED artifacts)
    live.test.js               runs custom/* against the cached pages
    extractor-support.test.js  the §11 extractor leaves (one per supported host)
  data/                        cached event-page fixtures (<name>.html + <name>.url)
  fullBrowserHeavyTests/       CI-only real-Chrome e2e (extension load, SPA render)
  infrastructure/              the renderers, fake-chrome, gallery builder, parsers,
                               snapshot/coverage harnesses (test-only helper code)
  ui-requirements-coverage.test.js  the leaf↔case bijection + kind routing gate
  product-requirements.test.js      runs the wired logic leaves, surfaces the tbd ones
```

Code shared with non-requirements callers stays where it's shared (e.g.
`data/cdp-client.js`, `data/render-page.js`, `data/spa-shell.js`, `test/harness.js`).

## Regenerating

- `npm run test:ui` — the pixel-exact snapshot tests.
- `npm run refresh:ui` — regenerate the `ui/cases/*.png` snapshots + the inline
  gallery in `Requirements.md` after an intentional popup/view/CSS/icon change.
  **Never** silently re-baseline a moved snapshot — surface the visual diff for
  approval (see [`docs/claude/workflow.md`](../docs/claude/workflow.md)).
- `npm run regen` — load lists + UI snapshots + fallback-coverage baseline.
- `npm run test:live` — the extractor live/integration + extractor-support +
  fallback-coverage suites (offline, against the committed fixtures).

## How to add a new supported site

Adding a per-site extractor is its own documented flow — see
[`docs/claude/adding-a-source.md`](../docs/claude/adding-a-source.md). It adds a
row to `Requirements.md` §11 (an `extractor` leaf) plus a reviewed live case under
`extractors/custom/`.

## Honesty caveat

A green build means every leaf is **claimed** by a case of the right kind, **not**
that every leaf is *faithfully* verified. The `behavior` cases stub the
`chrome.tabs.create`/`window.close` boundary; many `logic` leaves are `tbd`
(covered today by unit tests, not yet wired here). These gaps are deliberate and
tracked — see the banner in `Requirements.md` and `docs/claude/testing.md`.
