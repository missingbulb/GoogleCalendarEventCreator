// Per-leaf snapshot for requirement 10.2: a host on the denylist shows the GRAY
// toolbar icon. `kind: "icon"` routes this case to the toolbar-icon renderer (see
// render-snapshot.js) from a faked tab URL + host lists. The filename (req-10.2) is
// the link; its image is req-10.2.png.
"use strict";

module.exports = {
  kind: "icon",
  description: "a host in the denylist shows the gray icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://denied.test/an-article",
};
