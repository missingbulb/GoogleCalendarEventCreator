#!/usr/bin/env node
// Quality floor for an agent-produced integration case, enforced by
// phase2-finalize.sh BEFORE a PR is opened — a deterministic backstop to the
// agent's Step-1 judgment (architecture rule: bound the agent's output from
// outside the agent). A case fails the floor two ways:
//
//   - "empty"      — no events. The agent's deliberate bail signal (it judged the
//                    page unextractable and left the scaffolded case untouched).
//   - "degenerate" — an event with no location on its showings. This is the
//                    signature of a listing / index / artist page that yielded
//                    only a bare title, not a real event (#283 livenation.de:
//                    title "Muse", no venue). Location is per-instance (the
//                    multi-instance model has no top-level location), so a real
//                    event names a venue on every showing — a single-venue event
//                    repeats it, a touring show varies it. Every real committed
//                    case does, so this rejects nothing legitimate.
//
// A real event page essentially always names a venue; the absence of one on the
// showings is the cheapest reliable "this isn't a real event" tell we can check
// without re-parsing the page.
"use strict";

// An event is "located" when every one of its showings names a venue (its own).
// A flat event-level `location` is tolerated for hand-written/legacy shapes.
function eventHasLocation(e) {
  if (e && typeof e.location === "string" && e.location.trim()) return true;
  const times = e && Array.isArray(e.times) ? e.times : [];
  return times.length > 0 && times.every((t) => t && typeof t.location === "string" && t.location.trim());
}

function caseVerdict(caseObj) {
  const events =
    caseObj && caseObj.expected && Array.isArray(caseObj.expected.events)
      ? caseObj.expected.events
      : [];

  if (events.length === 0) return { ok: false, code: "empty" };

  if (events.some((e) => !eventHasLocation(e))) return { ok: false, code: "degenerate" };

  return { ok: true, code: "ok" };
}

module.exports = { caseVerdict };

// CLI: print the verdict code for the case file path in $CASE_FILE (used by
// phase2-finalize.sh). A missing/unparseable file reads as "empty".
if (require.main === module) {
  let obj = null;
  try {
    obj = require(require("node:path").resolve(process.env.CASE_FILE));
  } catch (_) {
    obj = null;
  }
  process.stdout.write(caseVerdict(obj).code);
}
