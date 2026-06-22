// Kind: icon — the toolbar icon (§10), verified by loading the REAL
// extension/icon/toolbar-icon.js into a fake browser and rendering the icon for a
// faked tab URL + host lists, compared pixel-exact to cases/<slug>.<id>.png.
// Shares the visual comparison engine/runner with popup
// (shared/render/visual-snapshots.test.js); only the pixel source differs.
"use strict";

module.exports = { image: true };
