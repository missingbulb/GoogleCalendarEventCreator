// Wall-clock display for absolute (offset) start-end times. When an extracted
// instance still carries a UTC offset — i.e. its timezone wasn't resolved at
// extraction time — the card must show the literal clock time and day written on
// the page, NOT the instant re-zoned to the renderer's timezone. The
// presentation-only floatLocal step in events-view.js strips the offset so these
// render as floating local time; THAT is what makes the snapshot deterministic
// wherever it's rasterized.
//
// Both times sit just past/before midnight so the offset, if it leaked through,
// would roll the date chip onto the wrong DAY (and shift the time across AM/PM) —
// a large, unmistakable diff, so the snapshot is a real gate, not a one-digit
// change that slips under the pixel tolerance. With the fix: Dec 7 12:30 AM and
// Dec 8 11:30 PM, exactly as the source pages read.
module.exports = {
  description:
    "Offset start times show the page's wall-clock day & time (the +02:00/-02:00 offset is stripped at render, not re-zoned across midnight)",
  data: {
    supported: true,
    events: [
      {
        title: "Midnight Jazz Session",
        location: "Cellar Club, Helsinki",
        start: "2026-12-07T00:30:00+02:00",
        end: "2026-12-07T02:00:00+02:00",
      },
      {
        title: "Late Telescope Viewing",
        location: "Atlantic Pier Observatory",
        start: "2026-12-08T23:30:00-02:00",
      },
    ],
  },
  listing: "none",
};
