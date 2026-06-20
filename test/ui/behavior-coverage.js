// The leaf requirements verified by a BEHAVIOR test rather than a UI snapshot.
//
// A pixel snapshot can show a rendered state but can never observe an *action*:
// "clicking this opens a new adjacent tab and closes the popup" has no pixels.
// Forcing such a leaf onto a snapshot case parks it on an image that can't verify
// it — exactly the anti-pattern issue #429 calls out, and the reason the UI
// coverage gate is SEGMENTED by the verification each leaf needs (see
// docs/engineeringPractices.md). These behavioral leaves are routed here, to
// test/unit/events-view-actions.test.js, which actually drives the click.
//
// Single source of truth shared by:
//   - test/unit/events-view-actions.test.js — asserts it covers exactly these IDs
//     (so this map can't claim a leaf the test forgot to exercise), and
//   - test/uber/ui-requirements-coverage.test.js — counts these leaves as covered
//     by the behavior test, and REJECTS any snapshot case that claims one.
//
// Each value notes what the behavior test verifies for that requirement.
"use strict";

const BEHAVIOR_COVERAGE = {
  "3.4": "clicking an affordance link opens its target in an adjacent new tab and closes the popup",
  "9.1": "clicking a single card opens that event's calendar template in a new tab",
  "9.2": "clicking a grouped card's instance button opens that specific showing's template",
  "9.3": "the opened template tab is adjacent (index+1) and the popup then closes",
};

module.exports = { BEHAVIOR_COVERAGE };
