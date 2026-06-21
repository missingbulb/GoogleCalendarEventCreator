// Per-leaf snapshot for requirement 10.3 (an `_(icon)_` leaf): any other page —
// neither supported nor denylisted, including an allowlisted host — keeps the
// default BLUE toolbar icon. Rendered by the toolbar-icon renderer (see
// render-snapshot.js) from a faked tab URL + host lists. The filename (req-10.3) is
// the link; its image is req-10.3.png.
"use strict";

module.exports = {
  description: "an allowlisted (not supported, not denied) host keeps the default blue icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://allowed.test/a-page",
};
