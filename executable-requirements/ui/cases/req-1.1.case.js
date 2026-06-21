// Per-leaf snapshot for requirement 1.1: the initial shell before extraction returns reads "Reading page…".
// The filename (req-1.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 1.1 in executable-requirements/Requirements.md.
"use strict";

module.exports = {
  description: "the initial shell before extraction returns reads \"Reading page\u2026\"",
  skipRender: true,
};
