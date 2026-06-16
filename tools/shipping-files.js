// Single source of truth for the files that make up the shippable extension —
// exactly what gets zipped for the Chrome Web Store and loaded as an unpacked
// extension. Everything else in the repo (tests, cached HTML, dev tooling,
// docs) is intentionally excluded.
//
// `tools/build-zip.js` reads this to build dist/google-calendar-event-creator.zip,
// and test/unit/shipping-files.test.js asserts it stays in sync with what the
// manifest and the popup actually load — so the zip can never silently drop a
// runtime file.

// Entries are paths relative to the repo root. A directory entry ships every
// file under it.
const SHIPPING_PATHS = [
  "manifest.json",
  "config.js", // tunable product decisions; imported by the popup modules at runtime
  "fallback-policy.js", // host classifier for the generic fallback; imported by the popup at runtime
  "pipeline", // the extraction pipeline + generated load list (popup fetches/injects)
  "ui", // popup (html/css/js + views) and the toolbar-icon service worker
  "icons", // toolbar icons: the per-size PNGs the manifest references
];

// Files that live UNDER a shipped directory but must NOT ship — dev-only
// artifacts the runtime never loads. Exact repo-relative paths. Currently none:
// the UI-snapshot inputs live under test/ (already unshipped), not under ui/.
const SHIPPING_EXCLUDES = [];

module.exports = { SHIPPING_PATHS, SHIPPING_EXCLUDES };
