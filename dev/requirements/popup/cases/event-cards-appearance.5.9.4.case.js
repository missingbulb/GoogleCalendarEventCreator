// A long venue clamps to two lines inside the bounded chip; the popup width never
// grows (the per-instance-location form of 5.8).
"use strict";

module.exports = {
  description: "a long venue clamps to two lines inside the bounded chip; the popup width never grows",
  data: { supported: true, events: [
    { title: "Lecture Series on Urban Planning and Sustainable Architecture", times: [
      { start: "2026-07-06T18:00:00", location: "The Steinhardt Museum of Natural History Auditorium, Tel Aviv University" },
      { start: "2026-07-13T18:00:00", location: "Porter School of Environmental Studies Green Building, Ramat Aviv Campus" },
    ] },
  ] },
  listing: "none",
};
