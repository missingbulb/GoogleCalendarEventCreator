#!/usr/bin/env node
// Quality floor for an agent-produced integration case, enforced by
// phase2-finalize.sh BEFORE a PR is opened — a deterministic backstop to the
// agent's Step-1 judgment (architecture rule: bound the agent's output from
// outside the agent). A case fails the floor two ways:
//
//   - "empty"      — no events. The agent's deliberate bail signal (it judged the
//                    page unextractable and left the scaffolded case untouched).
//   - "degenerate" — an event with no location. This is the signature of a
//                    listing / index / artist / tour page (many dates, no single
//                    venue) that yielded only a bare title, not a real single
//                    event (#283 livenation.de: title "Muse", location ""). Every
//                    real committed case has a non-empty location, so this rejects
//                    nothing legitimate.
//
// A real single event page essentially always names a venue; the absence of one
// is the cheapest reliable "this isn't a single event" tell we can check without
// re-parsing the page.
"use strict";

function caseVerdict(caseObj) {
  const events =
    caseObj && caseObj.expected && Array.isArray(caseObj.expected.events)
      ? caseObj.expected.events
      : [];

  if (events.length === 0) return { ok: false, code: "empty" };

  const hasEmptyLocation = events.some(
    (e) => !(e && typeof e.location === "string" && e.location.trim())
  );
  if (hasEmptyLocation) return { ok: false, code: "degenerate" };

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
