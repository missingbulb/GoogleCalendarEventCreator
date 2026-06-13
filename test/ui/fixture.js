// Fixed extraction result + tab info used to render the popup
// deterministically for the UI snapshot test.
"use strict";

const EXTRACTED_DATA = {
  title: "NYC Tech Mixer 2026",
  start: "2026-06-25T18:00:00-04:00",
  end: "2026-06-25T21:00:00-04:00",
  location: "The Williamsburg Hotel Bar, 96 Wythe Ave, Brooklyn, NY",
  description: "Join us for the best networking event in NYC!",
  multipleEvents: false,
};

const TAB = {
  id: 1,
  index: 0,
  title: "NYC Tech Mixer 2026 | Meetup",
  url: "https://www.meetup.com/nyctechmixer/events/311245599/",
};

module.exports = { EXTRACTED_DATA, TAB };
