// One entry point that renders ANY snapshot case to a PNG, dispatching by the
// leaf's verification kind in docs/uiRequirements.md. Both the snapshot runner
// (popup-snapshots.test.js) and the refresh script use it, so there is a single
// place that decides which renderer produces a case's pixels:
//
//   - an `_(icon)_` leaf  -> the toolbar-icon renderer (the real ui/toolbar-icon.js
//                            loaded into a fake browser; icon-renderer.js), fed the
//                            case's faked tab URL + host lists;
//   - everything else     -> the popup renderer (the real popup render() via
//                            satori; popup-renderer.js), fed the case's fake data.
//
// The comparison, storage (test/ui/cases/req-<id>.png), naming, and refresh are all
// shared — only the pixel source differs, because a popup and a toolbar icon are
// genuinely produced by different code paths.
"use strict";

const { renderCasePng } = require("./popup-renderer");
const { iconPngForUrl } = require("./icon-renderer");
const { leafRequirementKinds } = require("./ui-requirements");

// The single source of truth for which leaf is an icon leaf: the `_(icon)_` tag in
// the spec. Parsed once.
const KINDS = leafRequirementKinds();

function renderSnapshot(testCase) {
  const id = testCase.name.replace(/^req-/, "");
  if (KINDS[id] === "icon") return iconPngForUrl(testCase.tabUrl, testCase.lists);
  return renderCasePng(testCase);
}

module.exports = { renderSnapshot };
