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
  "background.js",
  "icon-state.js",
  "popup.html",
  "popup.js",
  "pipeline", // load-order.generated.json: the list popup.js fetches and injects
  "extractors", // every extractor file injected into the page
  "icons", // toolbar icons: plain + green/red state variants
];

module.exports = { SHIPPING_PATHS };
