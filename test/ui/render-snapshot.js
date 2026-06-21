// One entry point that renders ANY snapshot case to a PNG. Each case declares HOW
// it renders via its own `kind` field — so the rendering mechanism is a property of
// the case, not something re-derived from the spec. Most cases are the popup, so
// `kind` defaults to "popup" (DEFAULT_KIND) and only a non-popup case need set one.
// Adding a new rendered surface is just a new entry in RENDERERS plus cases that
// name it — nothing here or in the spec parser changes.
//
//   kind: "popup" (default) -> the popup's real render() via satori (popup-renderer.js)
//   kind: "icon"            -> the real extension/ui/toolbar-icon.js loaded into a fake browser
//                              (icon-renderer.js), fed the case's faked tabUrl + lists
//
// The comparison, storage (test/ui/cases/req-<id>.png), naming, and refresh are all
// shared across kinds — only the pixel source differs, because a popup and a toolbar
// icon are genuinely produced by different code paths.
"use strict";

const { renderCasePng } = require("./popup-renderer");
const { iconPngForUrl } = require("./icon-renderer");

const DEFAULT_KIND = "popup";

// kind -> (case) => Promise<Buffer>. A case is rendered by exactly one of these.
const RENDERERS = {
  popup: (testCase) => renderCasePng(testCase),
  icon: (testCase) => iconPngForUrl(testCase.tabUrl, testCase.lists),
};

function renderSnapshot(testCase) {
  const kind = testCase.kind || DEFAULT_KIND;
  const renderer = RENDERERS[kind];
  if (!renderer) {
    throw new Error(`case "${testCase.name}" has unknown kind "${kind}" (known: ${Object.keys(RENDERERS).join(", ")})`);
  }
  return renderer(testCase);
}

// Does this case produce a snapshot image? True for an image kind (popup/icon),
// false for a kind with no renderer (e.g. "behavior", verified by a click test, no
// pixels). The snapshot runner and the refresh script use this to skip non-image
// cases.
function rendersImage(testCase) {
  return Boolean(RENDERERS[testCase.kind || DEFAULT_KIND]);
}

module.exports = { renderSnapshot, rendersImage, RENDERERS, DEFAULT_KIND };
