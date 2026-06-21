// Scenario: the active tab is on a host in the DENYLIST — a site where we've
// deliberately decided not to extract events. The extension paints the GRAY
// toolbar icon.
//
// Data only, no assertions: the snapshot runner feeds `tabUrl` + `lists` to the
// extension's real icon pipeline and compares the result to the stored PNG. The
// filename (denylisted) is the link: docs/extension-icon-denylisted.png.
"use strict";

module.exports = {
  description: "a host in the denylist shows the gray icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://denied.test/an-article",
};
