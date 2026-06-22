// The single, pinned "now" the executable requirements tests render against.
//
// Why this exists: the popup renders some output relative to the current date —
// today only the event card's YEAR PILL (extension/events-popup/events-view.js
// `offYear`: a date outside the current year gets a gray "past" / accent "future"
// pill, a current-year date gets none). If the tests read the real clock, a case
// dated 2026 shows no pill this year but a "past" pill next year — so every
// date-bearing snapshot would silently rot the moment the wall-clock year ticks
// over, and the deterministic pixel diff (MAX_DIFF_RATIO = 0) would go red through
// no code change.
//
// So we PIN the reference instead of reading `new Date()`, and keep ONE copy of it
// here for every test entry point to share (the popup snapshot renderer and the
// behavior test both import it) — change the pinned year in one place, not several.
// The cases are authored against this year (2026), so they render pill-free.
//
// REFERENCE_NOW is the source-of-truth instant; REFERENCE_YEAR is what the popup
// actually consumes (its only now-dependent input is the year, threaded in as the
// `currentYear` argument that defaults to the real clock in production). The full
// instant is exposed too so a future test that needs finer granularity than the
// year has the same fixed reference to derive from.
"use strict";

// 2026-06-22 (matches the dates the cases are authored against). Local time — the
// only field read from it is the year, which is timezone-insensitive.
const REFERENCE_NOW = new Date(2026, 5, 22, 12, 0, 0);
const REFERENCE_YEAR = REFERENCE_NOW.getFullYear();

module.exports = { REFERENCE_NOW, REFERENCE_YEAR };
