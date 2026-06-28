// Unit tests for the auto-implement-extractor's case quality floor
// (case-quality.js's caseVerdict). The finalize workflow runs this before
// opening a PR: an empty case is the agent's bail, and an event
// with no location is a degenerate extraction off a listing/index page (#283
// livenation: title "Muse", location "") that should NOT become a PR. Every real
// committed case has a non-empty location, asserted here against the corpus too.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { caseVerdict } = require("../case-quality");

test("empty events is the bail signal", () => {
  assert.equal(caseVerdict({ expected: { events: [] } }).code, "empty");
  assert.equal(caseVerdict({}).code, "empty");
  assert.equal(caseVerdict(null).code, "empty");
});

test("an event with no location is degenerate (the #283 livenation shape)", () => {
  const livenation = {
    expected: {
      events: [
        { title: "Muse", location: "", ctz: null, times: [{ start: "2026-11-18T00:00:00.000Z" }] },
      ],
    },
  };
  assert.equal(caseVerdict(livenation).code, "degenerate");
});

test("a touring show with an empty event location but per-instance venues passes", () => {
  // The multi-venue tour shape: shared location "" because the venues vary, each
  // showing carrying its own. This is a real event, NOT the #283 degenerate shape.
  const tour = {
    expected: {
      events: [
        {
          title: "On Tour",
          location: "",
          times: [
            { start: "2026-09-04T20:00:00", location: "Paradiso, Amsterdam" },
            { start: "2026-09-11T20:00:00", location: "La Cigale, Paris" },
          ],
        },
      ],
    },
  };
  assert.equal(caseVerdict(tour).code, "ok");
});

test("an empty event location with a showing that also lacks a venue is still degenerate", () => {
  const bad = {
    expected: { events: [{ title: "Muse", location: "", times: [{ start: "2026-11-18T00:00:00.000Z" }] }] },
  };
  assert.equal(caseVerdict(bad).code, "degenerate");
});

test("a complete event with a venue passes", () => {
  const good = {
    expected: {
      events: [
        { title: "מופע שנות ה-90", location: "זאפה תל אביב, דרך מנחם בגין 144, IL", times: [{ start: "2026-07-02T21:30:00" }] },
      ],
    },
  };
  assert.equal(caseVerdict(good).code, "ok");
});

test("if ANY event lacks a location the case is degenerate", () => {
  const mixed = {
    expected: {
      events: [
        { title: "A", location: "Venue A" },
        { title: "B", location: "   " },
      ],
    },
  };
  assert.equal(caseVerdict(mixed).code, "degenerate");
});

test("every committed integration case clears the floor (guards against false rejects)", () => {
  const dir = path.join(__dirname, "..", "..", "requirements", "extractor", "expected");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const obj = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    // Only assert cases that actually carry events (some may be intentionally empty).
    if ((obj.expected?.events || []).length === 0) continue;
    assert.equal(caseVerdict(obj).code, "ok", `${f} should clear the quality floor`);
  }
});
