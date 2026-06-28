"use strict";

module.exports = {
  description: "a UTC offset is stripped to the literal wall-clock time, not re-zoned",
  data: { supported: true, events: [{ title: "Holiday Concert", start: "2026-07-04T21:00:00-05:00", location: "The Bandshell" }] },
  listing: "none",
};
