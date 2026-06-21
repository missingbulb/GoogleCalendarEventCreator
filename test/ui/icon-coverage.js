// The leaf requirements verified by the toolbar-ICON snapshot test rather than a
// popup UI snapshot.
//
// The toolbar/extension icon is pixel-assertable like a popup render leaf, but it
// is produced by a DIFFERENT harness: the real ui/toolbar-icon.js loaded into a
// fake browser (test/extension/fake-chrome.js), not the popup's render(). So an
// icon leaf carries no `req-<id>` popup case; it is routed here instead, to
// test/extension/extension-icon-snapshots.test.js, which generates the icon for a
// faked tab URL and compares it to docs/extension-icon-<case>.png.
//
// Maps each icon leaf ID -> the icon case name (test/extension/icon-cases/<case>.case.js,
// whose image is docs/extension-icon-<case>.png). Single source of truth shared by:
//   - test/extension/extension-icon-snapshots.test.js — asserts it maps to exactly
//     the cases that exist (so the manifest can't drift from the cases), and
//   - test/uber/ui-requirements-coverage.test.js — counts these leaves as covered
//     by the icon test, and REJECTS any popup req-<id> case that claims one.
//   - test/ui/build-requirements-gallery.js — embeds docs/extension-icon-<case>.png
//     as the leaf's left-cell image.
"use strict";

const ICON_COVERAGE = {
  "10.1": "supported",
  "10.2": "denylisted",
  "10.3": "default",
};

module.exports = { ICON_COVERAGE };
