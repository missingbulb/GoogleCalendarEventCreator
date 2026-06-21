// Scenario: the active tab is on a host in the ALLOWLIST — which, unlike the
// supported list, does NOT make a site a first-class source. The icon stays the
// manifest default (BLUE). This case exists to prove allowlist != green: a host
// can be in a list and still show the default icon.
//
// Data only, no assertions: the snapshot runner feeds `tabUrl` + `lists` to the
// extension's real icon pipeline and compares the result to the stored PNG. The
// filename (default) is the link: docs/extension-icon-default.png.
"use strict";

module.exports = {
  description: "a host in the allowlist (not supported, not denied) keeps the default blue icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://allowed.test/a-page",
};
