"use strict";

module.exports = {
  description: "a host in the denylist shows the gray icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://denied.test/an-article",
};
