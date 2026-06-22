// The single, pinned "now" the executable requirements tests render against.
//
// Why this exists: the popup renders some output relative to the current date —
// the event card's CORNER PILL (extension/events-popup/events-view.js `cornerPill`:
// an event before today gets a gray "past" pill; a future-YEAR event gets a green
// year pill; a current, not-yet-past date gets none). If the tests read the real
// clock, a case's pill would change as the wall clock advances — a date with no
// pill today sprouts a "past" pill once that day passes — so every date-bearing
// snapshot would silently rot, and the deterministic pixel diff (MAX_DIFF_RATIO =
// 0) would go red through no code change.
//
// So we PIN the reference instead of reading `new Date()`, and keep ONE copy of it
// here for every test entry point to share (the popup snapshot renderer and the
// behavior test both import it) — change the pinned "now" in one place, not several.
//
// The pinned day is 2026-06-01, chosen as the FLOOR of the dates the cases are
// authored against: every existing 2026 case date is on/after it, so they render
// pill-free (an "upcoming this year" event), while a case can deliberately date an
// event BEFORE it (earlier in 2026, or a prior year) to exercise the "past" pill.
// WHEN AUTHORING A NEW CASE: a neutral/upcoming event must be dated on or after
// this day, or it renders a "past" pill it didn't intend.
//
// REFERENCE_NOW is the source-of-truth instant the popup consumes (threaded in as
// `render({ now })` / `renderCard(card, tab, now)`, defaulting to the real clock in
// production); REFERENCE_YEAR is derived for any caller that only needs the year.
"use strict";

const REFERENCE_NOW = new Date(2026, 5, 1, 12, 0, 0); // 2026-06-01, local time
const REFERENCE_YEAR = REFERENCE_NOW.getFullYear();

module.exports = { REFERENCE_NOW, REFERENCE_YEAR };
