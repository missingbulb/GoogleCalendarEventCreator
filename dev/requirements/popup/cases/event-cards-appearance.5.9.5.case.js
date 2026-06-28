// All-day showings at different venues: plain day chips, each carrying its own
// venue, under an "All day" header (the shared-time label still leads since every
// showing is all-day).
"use strict";

module.exports = {
  description: "all-day showings at different venues — day chips with venues under an 'All day' header",
  data: { supported: true, events: [
    { title: "Pop-up Craft Market", times: [
      { start: "2026-07-04", location: "Sarona Market" },
      { start: "2026-07-18", location: "Jaffa Port" },
    ] },
  ] },
  listing: "none",
};
