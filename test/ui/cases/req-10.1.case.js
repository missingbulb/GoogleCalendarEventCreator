// Per-leaf snapshot for requirement 10.1 (an `_(icon)_` leaf): a host in the
// supported list shows the GREEN toolbar icon. Rendered by the toolbar-icon
// renderer (not the popup render()) — see render-snapshot.js — so this case
// supplies a faked tab URL + host lists instead of popup data. The filename
// (req-10.1) is the link; its image is req-10.1.png.
"use strict";

module.exports = {
  description: "a host in the supported list shows the green icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://supported.test/some-event",
};
