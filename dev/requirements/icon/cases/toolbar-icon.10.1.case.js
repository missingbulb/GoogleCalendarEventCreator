"use strict";

module.exports = {
  description: "a host in the supported list shows the green icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://supported.test/some-event",
};
