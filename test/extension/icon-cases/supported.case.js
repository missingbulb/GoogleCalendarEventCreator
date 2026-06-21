// Scenario: the active tab is on a host in the SUPPORTED list — a site with a
// dedicated, first-class extractor. The extension paints the GREEN toolbar icon.
//
// Data only, no assertions: the snapshot runner feeds `tabUrl` + `lists` to the
// extension's real icon pipeline and compares the result to the stored PNG. The
// filename (supported) is the link: docs/extension-icon-supported.png.
"use strict";

module.exports = {
  description: "a host in the supported list shows the green icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://supported.test/some-event",
};
