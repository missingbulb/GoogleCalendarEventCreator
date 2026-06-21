// Behavior leaf 3.4 — `kind: "behavior"`, so it is verified by a click test
// (executable-requirements/ui/events-view-actions.test.js), not a snapshot image: a static PNG has
// no pixels for "a tab opened". The render-snapshot dispatcher skips a behavior
// case, and the coverage gate requires it carry NO req-<id>.png.
"use strict";

module.exports = {
  kind: "behavior",
  description: "clicking an affordance link opens its target in an adjacent new tab and closes the popup",
};
