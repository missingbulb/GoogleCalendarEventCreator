// Per-leaf snapshot for requirement 10.1: a host in the supported list shows the
// GREEN toolbar icon. `kind: "icon"` routes this case to the toolbar-icon renderer
// (not the popup render()) — see render-snapshot.js — so it supplies a faked tab URL
// + host lists instead of popup data. The filename (req-10.1) is the link; its image
// is req-10.1.png.
"use strict";

module.exports = {
  kind: "icon",
  description: "a host in the supported list shows the green icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://supported.test/some-event",
};
