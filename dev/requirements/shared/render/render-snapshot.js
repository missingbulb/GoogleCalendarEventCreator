// One entry point that renders ANY snapshot case to a PNG. A case's `kind` — set
// from the folder it lives in (loadCases), so it's always present and never
// guessed — picks the renderer. Adding a new rendered surface is just a new entry
// in RENDERERS plus cases under a folder that names it; nothing here changes.
//
//   popup -> the popup's real render() via satori (popup-renderer.js)
//   icon  -> the real toolbar-icon worker loaded into a fake browser
//            (icon-renderer.js), fed the case's faked tabUrl + lists
//
// The comparison, storage, naming, and refresh are all shared across kinds — only
// the pixel source differs, because a popup and a toolbar icon are genuinely
// produced by different code paths.
"use strict";

const { renderCasePng } = require("./popup-renderer");
const { iconPngForUrl } = require("./icon-renderer");

// kind -> (case) => Promise<Buffer>. A case is rendered by exactly one of these.
const RENDERERS = {
  popup: (testCase) => renderCasePng(testCase),
  icon: (testCase) => iconPngForUrl(testCase.tabUrl, testCase.lists),
};

function renderSnapshot(testCase) {
  const renderer = RENDERERS[testCase.kind];
  if (!renderer) {
    throw new Error(`case "${testCase.name}" has unknown kind "${testCase.kind}" (known: ${Object.keys(RENDERERS).join(", ")})`);
  }
  return renderer(testCase);
}

// Does this case produce a snapshot image? True for an image kind (popup/icon),
// false for a kind with no renderer (e.g. "behavior", verified by a click test, no
// pixels). The snapshot runner and the refresh script use this to skip non-image
// cases.
function rendersImage(testCase) {
  return Boolean(RENDERERS[testCase.kind]);
}

module.exports = { renderSnapshot, rendersImage, RENDERERS };
