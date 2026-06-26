"use strict";

module.exports = {
  description: "an allowlisted (not supported, not denied) host keeps the default blue icon",
  lists: { supportedDomains: ["supported.test"], denylist: ["denied.test"], allowlist: ["allowed.test"] },
  tabUrl: "https://allowed.test/a-page",
};
