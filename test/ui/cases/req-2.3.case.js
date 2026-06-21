// Per-leaf snapshot for requirement 2.3: on a denylisted host the glyph stands alone \u2014 no link beneath it.
// The filename (req-2.3) is the link; build-requirements-gallery.js embeds this
// image inline beneath 2.3 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "on a denylisted host the glyph stands alone \u2014 no link beneath it",
  data: { supported: false, events: [] },
  listing: "deny",
};
