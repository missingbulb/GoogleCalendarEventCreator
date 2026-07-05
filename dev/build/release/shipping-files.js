// Single source of truth for the files that make up the shippable extension —
// exactly what gets zipped for the Chrome Web Store and loaded as an unpacked
// extension. Everything else in the repo (tests, cached HTML, dev tooling,
// docs) is intentionally excluded.
//
// `dev/build/release/build-zip.js` reads this to build dist/google-calendar-event-creator.zip,
// and dev/build/release/shipping-files.test.js asserts it stays in sync with what the
// manifest and the popup actually load — so the zip can never silently drop a
// runtime file.

// The whole deployable extension lives in this one subfolder of the repo — it
// IS the extension root (the folder Chrome loads). The zip is built from inside
// it, so the archive has manifest.json at its top (no leading repo dir).
const EXTENSION_DIR = "extension";

// Entries are paths relative to EXTENSION_DIR (the extension root). A directory
// entry ships every file under it.
const SHIPPING_PATHS = [
  "manifest.json",
  "config.js", // tunable product decisions; imported by the popup modules at runtime
  "fallback-policy.js", // host classifier for the generic fallback; imported by the popup at runtime
  "fallback-lists.json", // the allow/deny/supported host lists; fetched by the worker, imported by config.js
  "event-extractors", // the extractors (custom sources + helpers + orchestrator) + generated load list (popup fetches/injects)
  "events-popup", // popup (html/css/js + views) and the calendar-URL builder
  "icon", // the toolbar-icon service worker and its images/ PNGs the manifest references
];

// Files that live UNDER a shipped directory but must NOT ship — dev-only
// artifacts the runtime never loads. Exact repo-relative paths. Currently none:
// the UI-snapshot inputs live under dev/requirements/, not under events-popup/.
const SHIPPING_EXCLUDES = [];

// True when `file` (a path relative to EXTENSION_DIR) ships: under a listed
// path, and not specifically excluded. The one membership predicate for the
// shipping set — the zip guard test and the daily-release change filter
// (filter-shipped-paths.js) both decide through it.
function isShipped(file) {
  if (SHIPPING_EXCLUDES.includes(file)) return false;
  return SHIPPING_PATHS.some((p) => file === p || file.startsWith(p + "/"));
}

module.exports = { EXTENSION_DIR, SHIPPING_PATHS, SHIPPING_EXCLUDES, isShipped };
