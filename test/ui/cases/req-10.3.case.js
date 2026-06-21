// Per-leaf snapshot for requirement 10.3: any other page — neither supported nor
// denylisted, including an allowlisted host — keeps the default BLUE toolbar icon.
// `kind: "icon"` routes this case to the toolbar-icon renderer (see
// render-snapshot.js) from a faked tab URL + host lists. The filename (req-10.3) is
// the link; its image is req-10.3.png.
"use strict";

module.exports = {
  kind: "icon",
  description: "an allowlisted (not supported, not denied) host keeps the default blue icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://allowed.test/a-page",
};
