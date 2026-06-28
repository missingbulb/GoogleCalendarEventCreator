#!/usr/bin/env node
// Quality floor for an agent-produced integration case, enforced by
// phase2-finalize.sh BEFORE a PR is opened — a deterministic backstop to the
// agent's Step-1 judgment (architecture rule: bound the agent's output from
// outside the agent). A case fails the floor two ways:
//
//   - "empty"      — no events. The agent's deliberate bail signal (it judged the
//                    page unextractable and left the scaffolded case untouched).
//   - "degenerate" — an event with no location ANYWHERE. This is the signature of
//                    a listing / index / artist page that yielded only a bare
//                    title, not a real event (#283 livenation.de: title "Muse",
//                    location "", no per-showing venue). A venue counts whether it
//                    sits at the event level OR on every showing in times[] — a
//                    multi-venue touring show legitimately has an empty event-level
//                    location with each instance carrying its own venue, and that
//                    is NOT degenerate. Every real committed case names a venue one
//                    way or the other, so this rejects nothing legitimate.
//
// A real event page essentially always names a venue (shared, or per showing); the
// absence of one anywhere is the cheapest reliable "this isn't a real event" tell
// we can check without re-parsing the page.
"use strict";

// An event is "located" when it names a venue at the event level, OR every one of
// its showings names its own (the touring-show shape: shared location "", per
// instance venues).
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
